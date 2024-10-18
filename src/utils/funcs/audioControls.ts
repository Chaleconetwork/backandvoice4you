const tracks: (AudioBufferSourceNode | null)[] = [];
let audioContext: AudioContext | null = null;
const pausedTimes: number[] = [];
const startTimes: number[] = [];
const isPlaying: boolean[] = []; // Cambia a un arreglo para manejar el estado individualmente

// const MAX_TRACKS = 10; // Cambia esto según el número máximo de pistas que esperas manejar
// for (let i = 0; i < MAX_TRACKS; i++) {
//     isPlaying[i] = false; // Inicializar todos los estados como false
//     tracks[i] = null; // Inicializar todas las pistas como null
// }

export function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext)();
    }
    return audioContext;
}

export async function loadAudioBuffers(buffers: ArrayBuffer[]) {
    const audioContext = initAudioContext();

    try {
        const audioBuffers = await Promise.all(buffers.map(buffer => audioContext.decodeAudioData(buffer)));
        return audioBuffers; // Devolver un array de AudioBuffers
    } catch (error) {
        console.error("Error decoding audio data:", error);
        throw new Error("Error decoding audio data");
    }
}

export function playAudio(buffer: AudioBuffer, index: number, gainValue: number = 1, offset = 0) {
    if (!audioContext) {
        console.error("AudioContext is not initialized.");
        return;
    }

    if (!buffer) {
        console.error(`Cannot play audio at index ${index}. Buffer is null.`);
        return;
    }

    const track = audioContext.createBufferSource();
    track.buffer = buffer;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = gainValue;

    track.connect(gainNode).connect(audioContext.destination);
    track.start(0, offset);

    // Almacenar la pista y su estado
    tracks[index] = track;
    startTimes[index] = audioContext.currentTime - offset;
    isPlaying[index] = true; // Marcar como reproducido

    // console.log(displayAudioDuration(duration))
    console.log(`Playing audio at index: ${index}, isPlaying: ${isPlaying[index]} Track: ${tracks[index]}`); // Esto debería mostrar true
};

export function displayAudioDuration(duration: number) {
    // Convertir la duración en minutos y segundos
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60).toString().padStart(2, '0'); // Asegura que los segundos siempre tengan 2 dígitos
    return [minutes, parseInt(seconds)]
}

export function pauseAudios(index: number) {
    if (!audioContext) {
        console.error("AudioContext is not initialized.");
        return;
    }

    if (isPlaying[index] && tracks[index]) {
        pausedTimes[index] = audioContext.currentTime - startTimes[index];
        tracks[index].stop(); // Detener la pista
        isPlaying[index] = false
    }
}

export function resumeAudios(buffer: AudioBuffer, index: number, gainValue: number) {
    if (!audioContext) {
        console.error("AudioContext is not initialized.");
        return;
    }

    if (!isPlaying[index]) {
        playAudio(buffer, index, gainValue, pausedTimes[index])
    }
}

export async function mixAudios(audioBuffers: AudioBuffer[], gains: number[] = []) {
    console.log(gains)
    const context = new OfflineAudioContext(2, Math.max(...audioBuffers.map(buffer => buffer.length)), audioBuffers[0].sampleRate);

    // Crear un array para los nodos de ganancia
    const gainNodes = audioBuffers.map((_, index) => {
        const gainNode = context.createGain();
        gainNode.gain.value = gains[index] || 1; // Usa la ganancia proporcionada o 1 por defecto
        return gainNode;
    });

    // Crear los buffer source y conectarlos
    audioBuffers.forEach((buffer, index) => {
        const track = context.createBufferSource();
        track.buffer = buffer;
        track.connect(gainNodes[index]).connect(context.destination); // Conectar a su nodo de ganancia y luego al destino
        track.start(0);
    });

    // Renderizar el buffer mezclado
    const mixedBuffer = await context.startRendering();
    return mixedBuffer;
}

export function bufferToWave(abuffer: AudioBuffer, len: number): Blob {
    const numOfChannels = abuffer.numberOfChannels,
        length = len * numOfChannels * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [],
        sampleRate = abuffer.sampleRate;

    let pos = 0;

    // Funciones auxiliares para establecer datos en el DataView
    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // Escribir cabecera WAVE
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // longitud del archivo - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // longitud = 16
    setUint16(1); // PCM (sin compresión)
    setUint16(numOfChannels);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChannels); // avg. bytes/sec
    setUint16(numOfChannels * 2); // bloque-alineación
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // longitud del chunk

    // Escribir datos intercalados
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