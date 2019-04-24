import * as tf from '@tensorflow/tfjs'
import { loadFrozenModel } from '@tensorflow/tfjs-converter';


export default class CustomModel {

  modelPath;
  weightPath;
  model;
  classes;

  constructor(modelName, classes = {}) {
    this.modelPath =
      `https://storage.googleapis.com/${modelName}/tensorflowjs_model.pb`
    this.weightPath =
      `https://storage.googleapis.com/${modelName}/weights_manifest.json`
    this.classes = { ...classes };
  }

  load = async () => {
    this.model = await loadFrozenModel(this.modelPath, this.weightPath);
  };


  infer = async (img, ctx, maxNumBoxes) => {
    const batched = tf.tidy(() => {
      if (!(img instanceof tf.Tensor)) {
        img = tf.fromPixels(img)
      }
      return img.expandDims(0)
    })
    const height = batched.shape[1]
    const width = batched.shape[2]

    const result = await this.model.executeAsync(batched)
    const boxes = result[0].dataSync()
    const scores = result[1].dataSync()

    batched.dispose()
    tf.dispose(result)

    const [maxScores, classes] = this.calculateMaxScores(
      scores,
      result[1].shape[1]
    )

    const prevBackend = tf.getBackend() // run post process in cpu

    tf.setBackend('cpu')
    const indexTensor = tf.tidy(() => {
      const boxes2 = tf.tensor2d(boxes, [
        result[0].shape[1],
        result[0].shape[2]
      ])
      return tf.image.nonMaxSuppression(
        boxes2,
        maxScores,
        maxNumBoxes,
        0.5,
        0.5
      )
    })
    const indexes = indexTensor.dataSync()
    indexTensor.dispose()

    tf.setBackend(prevBackend)
    return this.buildDetectedObjects(
      width,
      height,
      boxes,
      maxScores,
      indexes,
      classes
    )
  }

  buildDetectedObjects = (width, height, boxes, scores, indexes, classes) => {
    const count = indexes.length
    const objects = []

    for (let i = 0; i < count; i++) {
      const bbox = []

      for (let j = 0; j < 4; j++) {
        bbox[j] = boxes[indexes[i] * 4 + j]
      }

      const minY = bbox[0] * height
      const minX = bbox[1] * width
      const maxY = bbox[2] * height
      const maxX = bbox[3] * width
      bbox[0] = minX
      bbox[1] = minY
      bbox[2] = maxX - minX
      bbox[3] = maxY - minY
      objects.push({
        bbox: bbox,
        class: this.classes[classes[indexes[i]] + 1].displayName,
        score: scores[indexes[i]]
      })
    }

    return objects
  }

  calculateMaxScores = (scores, numBoxes, numClasses = 2) => {
    const maxes = []
    const classes = []

    for (let i = 0; i < numBoxes; i++) {
      let max = Number.MIN_VALUE
      let index = -1

      for (let j = 0; j < numClasses; j++) {
        if (scores[i * numClasses + j] > max) {
          max = scores[i * numClasses + j]
          index = j
        }
      }

      maxes[i] = max
      classes[i] = index
    }

    return [maxes, classes]
  }

  detect = async (img, maxNumBoxes = 20) => {
    return this.infer(img, maxNumBoxes)
  }

  dispose = () => {
    if (this.model) {
      this.model.dispose()
    }
  }
}
