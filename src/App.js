import React, { Component, Fragment } from 'react'
import CustomModel from './custom-model';

const classes = {
  1: {
    name: 'void',
    id: 1,
    displayName: 'void',
  },
  2: {
    name: 'lack',
    id: 2,
    displayName: 'lack',
  },
}

class App extends Component {

  state = {
    imgSrc: '',
    disabled: true,
  }

  model = null;
  imgRef = React.createRef();
  canvasRef = React.createRef();
  inputRef = React.createRef();

  async componentDidMount () {
    this.model = new CustomModel('teradatacv', classes);
    await this.model.load();
    this.setState({ disabled: false })
    console.log(this.state.disabled && !this.state.imgSrc);
  }

  componentWillUnmount () {
    this.model.dispose();
  }

  onChange = () => {
    this.setState({ imgSrc: window.URL.createObjectURL(this.inputRef.current.files[0]) })
  }

  onButtonClick = async () => {
    console.log('Detection started');
    console.time('Detection, ms');
    const result = await this.model.detect(this.imgRef.current);
    console.timeEnd('Detection, ms');
    const context = this.canvasRef.current.getContext('2d');
    this.canvasRef.current.width = this.imgRef.current.width;
    this.canvasRef.current.height = this.imgRef.current.height;
    context.drawImage(this.imgRef.current, 0, 0);
    context.font = '20px Arial';

    console.log('number of detections: ', result.length);
    for (let i = 0; i < result.length; i++) {
      context.beginPath();
      context.rect(...result[i].bbox);
      context.lineWidth = 5;
      context.strokeStyle = 'green';
      context.fillStyle = 'green';
      context.stroke();
      context.fillText(
        result[i].score.toFixed(3) + ' ' + result[i].class, result[i].bbox[0],
        result[i].bbox[1] > 10 ? result[i].bbox[1] - 5 : 10);
    }

  }

  render() {
    return (
      <Fragment>
        <input
          ref={this.inputRef}
          name="image" type="file"
          accept="image/*"
          onChange={this.onChange}
          disabled={this.state.disabled}
        />
        <button
          onClick={this.onButtonClick}
          disabled={!this.state.imgSrc}
        >
          Detect
        </button>
        <img
          ref={this.imgRef}
          src={this.state.imgSrc}
          alt=""
        />
        <canvas
          ref={this.canvasRef}
        />
      </Fragment>
    );
  }
}

export default App;
