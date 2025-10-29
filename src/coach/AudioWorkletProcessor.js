class CoachRecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { targetSampleRate = 16000, frameSize = 640 } = options.processorOptions ?? {};
    this.targetSampleRate = targetSampleRate;
    this.frameSize = frameSize;
    this.cache = [];
    this.samples = [];
    this.sourceSampleRate = sampleRate;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }
    const channel = input[0];
    if (!channel) {
      return true;
    }
    const downsampled = this.downsample(channel, this.sourceSampleRate, this.targetSampleRate);
    if (!downsampled) {
      return true;
    }
    this.cache.push(...downsampled);
    while (this.cache.length >= this.frameSize) {
      const frame = this.cache.splice(0, this.frameSize);
      const buffer = new ArrayBuffer(frame.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < frame.length; i += 1) {
        view.setInt16(i * 2, frame[i], true);
      }
      this.port.postMessage(buffer);
    }
    return true;
  }

  downsample(buffer, inRate, outRate) {
    if (outRate === inRate) {
      return buffer.map((value) => this.floatToInt16(value));
    }
    if (outRate > inRate) return null;
    const ratio = inRate / outRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
        accum += buffer[i];
        count += 1;
      }
      result[offsetResult] = this.floatToInt16(accum / count);
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  floatToInt16(value) {
    const v = Math.max(-1, Math.min(1, value));
    return v < 0 ? v * 0x8000 : v * 0x7fff;
  }
}

registerProcessor('coach-recorder-processor', CoachRecorderProcessor);
