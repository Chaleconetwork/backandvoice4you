let audioContext: AudioContext | null = null;
let track1: AudioBufferSourceNode | null = null;
let track2: AudioBufferSourceNode | null = null;
let startTime: number = 0;
let isPlaying = false;
let pausedTime = 0;

export function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

export async function loadAudioBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
    const audioContext = initAudioContext();

    try {
        const audioBuffer1 = await audioContext.decodeAudioData(buffer1);
        const audioBuffer2 = await audioContext.decodeAudioData(buffer2);
        // console.log(audioBuffer1, audioBuffer2)
        return { audioBuffer1, audioBuffer2 };
    } catch (error) {
        console.error("Error decoding audio data:", error);
        throw new Error("Error decoding audio data");
    }
}

export function playAudios(audioBuffer1: AudioBuffer, audioBuffer2: AudioBuffer, offset = 0) {
    if (!audioContext) {
        console.error("AudioContext is not initialized.");
        return;
    }

    // Crear nodos de audio para ambos archivos
    track1 = audioContext.createBufferSource();
    track2 = audioContext.createBufferSource();

    track1.buffer = audioBuffer1;
    track2.buffer = audioBuffer2;

    // Conectar ambos nodos al destino
    track1.connect(audioContext.destination);
    track2.connect(audioContext.destination);

    // Iniciar reproducción desde el offset (si es reanudación)
    track1.start(0, offset);
    track2.start(0, offset);

    startTime = audioContext.currentTime - offset;
    isPlaying = true;
}


export function pauseAudios() {
    if (!audioContext) {
        console.error("AudioContext is not initialized.");
        return;
    }
    console.log(isPlaying)
    if (isPlaying && track1 && track2) {
        pausedTime = audioContext.currentTime - startTime;
        track1.stop();
        track2.stop();
        isPlaying = false;
    }
}

export function resumeAudios(audioBuffer1: AudioBuffer, audioBuffer2: AudioBuffer) {
    if (!isPlaying) {
        playAudios(audioBuffer1, audioBuffer2, pausedTime);
    }
}

export async function mixAudios(audioBuffer1: AudioBuffer, audioBuffer2: AudioBuffer, gain1: number = 1, gain2: number = 1) {
    const context = new OfflineAudioContext(2, Math.max(audioBuffer1.length, audioBuffer2.length), audioBuffer1.sampleRate);

    // Crear los nodos de ganancia para cada track
    const gainNode1 = context.createGain();
    const gainNode2 = context.createGain();

    gainNode1.gain.value = gain1;
    gainNode2.gain.value = gain2;

    // Crear los buffer source
    const track1 = context.createBufferSource();
    const track2 = context.createBufferSource();

    track1.buffer = audioBuffer1;
    track2.buffer = audioBuffer2;

    // Conectar cada track a su nodo de ganancia y luego al destino
    track1.connect(gainNode1).connect(context.destination);
    track2.connect(gainNode2).connect(context.destination);

    // Iniciar las pistas
    track1.start(0);
    track2.start(0);

    // Procesar la mezcla y renderizarla
    const renderedBuffer = await context.startRendering();

    return renderedBuffer;
}

export function bufferToWave(abuffer: AudioBuffer, len: number): Blob {
    const numOfChannels = abuffer.numberOfChannels,
        length = len * numOfChannels * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [],
        sampleRate = abuffer.sampleRate;

    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // Write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChannels);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChannels); // avg. bytes/sec
    setUint16(numOfChannels * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (let i = 0; i < abuffer.length; i++) {
        for (let channel = 0; channel < numOfChannels; channel++) {
            channels[channel] = abuffer.getChannelData(channel);
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            pos += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}