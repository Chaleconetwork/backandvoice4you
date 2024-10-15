import { bufferToWave, displayAudioDuration, loadAudioBuffers, mixAudios, pauseAudios, playAudio, resumeAudios } from "@/utils/funcs/audioControls";
import { ChangeEvent, useEffect, useRef, useState } from "react"
import { FaPlayCircle, FaRegPauseCircle } from "react-icons/fa";

export default function Home() {
    const [audioBuffers, setAudioBuffers] = useState<AudioBuffer[] | null>(null);
    const [isDownloadEnabled, setIsDownloadEnabled] = useState<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [textAlert, setTextAlert] = useState<string>('')
    const [duration, setDuration] = useState<{ minutes: number, seconds: number }[] | null>();
    const [pause, setPause] = useState<boolean>(false);
    const [gains, setGains] = useState<number[]>([]);
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]); // Refs para los canvas

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) {
            console.log('No se cargaron los audios')
            return;
        }

        const fileNamesList = Array.from(files).map(file => file.name);
        setFileNames(prev => [...prev, ...fileNamesList])

        const fileArray = Array.from(files);
        setSelectedFiles(prev => {
            const newSelectedFiles = [...prev, ...fileArray];
            if (newSelectedFiles.length === 2)
                setIsDownloadEnabled(true)
            return newSelectedFiles;
        })

        setGains(Array(fileArray.length).fill(1));
    };

    async function loadAudios() {
        try {
            const buffers = await Promise.all(selectedFiles.map(file => file.arrayBuffer()));
            const loadedBuffers = await loadAudioBuffers(buffers);
            setAudioBuffers(loadedBuffers);

            const calculatedDurations = loadedBuffers.map(buffer => {
                const [minutes, seconds] = displayAudioDuration(buffer.duration);
                return { minutes, seconds };
            });

            setDuration(calculatedDurations);

            // Dibujar la forma de onda para cada buffer
            loadedBuffers.forEach((buffer, index) => {
                drawWaveform(buffer, canvasRefs.current[index]);
            });
        } catch (error) {
            console.error("Error loading audio buffers:", error);
        }
    }

    const drawWaveform = (buffer: AudioBuffer, canvas: HTMLCanvasElement | null) => {
        if (!canvas) return;

        const canvasCtx = canvas.getContext("2d");
        if (!canvasCtx) return;

        const width = canvas.width;
        const height = canvas.height;
        const data = buffer.getChannelData(0); // Obtén el primer canal de datos de audio
        const step = Math.ceil(data.length / width); // Escala la longitud del buffer al ancho del canvas
        const amp = height / 2;

        canvasCtx.clearRect(0, 0, width, height);
        canvasCtx.fillStyle = "lightgray";
        canvasCtx.fillRect(0, 0, width, height);

        canvasCtx.beginPath();
        canvasCtx.moveTo(0, amp);

        const halfH = height / 2;

        for (let i = 0; i < width; i++) {
            let min = Infinity;
            let max = -Infinity;
            const slice = data.slice(i * step, (i + 1) * step); // Seleccionando el segmento de datos de audio

            for (let j = 0; j < slice.length; j++) {
                if (slice[j] < min) min = slice[j];
                if (slice[j] > max) max = slice[j];
            }

            canvasCtx.fillRect(i, (1 + min) * halfH, 1, Math.max(1, (max - min) * halfH)); // Dibujando la onda
        }

        canvasCtx.strokeStyle = "blue";
        canvasCtx.stroke();
    };

    const handlePlay = (index: number) => {
        if (audioBuffers && audioBuffers[index]) {
            pauseAudios(index); // Detener otros audios si se desea
            playAudio(audioBuffers[index], index, gains[index]);
            const [minutes, seconds] = displayAudioDuration(audioBuffers[index].duration)

            // setDuration({ minutes: minutes, seconds: seconds })
            setPause(true)
        } else {
            console.error('No hay ningún archivo de audio cargado');
        }
    };

    const handlePause = (index: number) => {
        pauseAudios(index)
        setPause(false)
    }

    const handleResume = (index: number) => {
        if (audioBuffers && audioBuffers.length > 0) {
            resumeAudios(audioBuffers[index], index, gains[index]);
            setPause(true)
        }
    };

    const handleChangeGain = (event: ChangeEvent<HTMLInputElement>, index: number) => {
        const newValue = parseFloat(event.target.value);
        setGains(prevGains => {
            const updatedGains = [...prevGains];
            updatedGains[index] = newValue;
            return updatedGains;
        });
    };

    const MixAndDownload = async () => {
        if (!audioBuffers || audioBuffers.length === 0) {
            console.error("No hay buffers de audio cargados.");
            return;
        }

        try {
            const mixedBuffer = await mixAudios(audioBuffers, gains);

            // Verifica que mixedBuffer sea válido
            if (!mixedBuffer) {
                console.error("No se pudo mezclar los audios.");
                return;
            }

            // Usa la longitud del buffer mezclado para convertir a WAV
            const wavBlob = bufferToWave(mixedBuffer, mixedBuffer.length);
            const url = URL.createObjectURL(wavBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = "audio_mezclado.wav";
            link.style.display = 'none';
            document.body.appendChild(link);

            link.click(); // Inicia la descarga
            link.remove(); // Elimina el enlace del DOM
            URL.revokeObjectURL(url); // Libera el objeto URL
        } catch (error) {
            console.error("Error mixing and downloading audio:", error);
        }
    };

    const handleDownloadClick = async () => {
        try {
            if (isDownloadEnabled)
                await MixAndDownload();
            if (!isDownloadEnabled)
                setTextAlert('Debes cargar mínimo 2 audios para usar esta opción');
        } catch (error) {
            console.error("Error during download:", error);
        }
    };

    useEffect(() => {
        loadAudios()
    }, [selectedFiles, pause])

    return (
        <div className="w-[80%] mx-auto">
            <h1 className="font-bold text-5xl text-center uppercase mt-16">Back & Voice 4 You</h1>
            <h3 className="text-center text-xl mt-2">Mezcla audios para que suenen simultaneamente en un solo archivo</h3>
            <main className="mt-10">
                <section className="border border-black/20 dark:border-white/20 rounded-2xl p-4 mb-4">
                    <div className="dark:border-white/20 border border-black/20 p-6 rounded-2xl">
                        <h2 className="text-lg font-semibold mb-2">Panel de control</h2>
                        <div className="flex justify-between items-center">
                            <div>
                                <label htmlFor="files" className="shadow-sm hover:shadow-blue-500 hover:bg-blue-400 transition delay-100 duration-300 ease-in-out p-2 rounded-md font-semibold cursor-pointer shadow-blue-500 bg-blue-500 text-white">
                                    Agregar audio
                                </label>
                                <input id="files" multiple onChange={handleFileChange} className="hidden" type="file" />
                            </div>
                            <button
                                onClick={handleDownloadClick}
                                className={`border border-black/20 dark:border-white/20 mt-2 mr-3 p-2 rounded-md font-semibold ${isDownloadEnabled ? 'bg-green-500 opacity-100 text-white cursor-pointer' : 'cursor-default opacity-55'}`}
                            >
                                Descargar Mezclado
                            </button>
                        </div>
                    </div>
                    <div className="block mt-4 border border-black/20 dark:border-white/20 rounded-2xl p-4">
                        <h3 className="font-semibold text-lg">Audios cargados</h3>
                        {fileNames.map((name, index) => (
                            <div className="flex justify-between border border-black/20 dark:border-white/20 rounded-md p-4 mt-3" key={index}>
                                <h3 className="dark:text-white/80">{name}</h3>
                                <div className="flex items-center gap-2">
                                    {/* <h2 className="text-end text-lg">{duration?.minutes}:{duration?.seconds}</h2> */}
                                    <button
                                        onClick={() => handlePlay(index)}
                                        className={`${pause == false && 'text-lg my-2 px-4 py-2 border border-black/20 dark:border-white/20 inline-block rounded-md cursor-pointer'}`}>
                                        {
                                            pause == false && <FaPlayCircle />
                                        }
                                    </button>
                                    <button
                                        onClick={() => handlePause(index)}
                                        className={`${pause && 'text-lg my-2 px-4 py-2 border border-black/20 dark:border-white/20 inline-block rounded-md cursor-pointer'}`}>
                                        {
                                            pause && <FaRegPauseCircle />
                                        }
                                    </button>
                                    <button
                                        onClick={() => handleResume(index)}
                                        className="text-lg my-2 px-4 py-2 border border-black/20 dark:border-white/20 inline-block rounded-md cursor-pointer">
                                        {
                                            <FaPlayCircle />
                                        }
                                    </button>
                                    {/* {selectedFiles.map((file, index) => ( */}
                                    <div key={index} className="pl-4 rounded-md text-center border border-black/20 dark:border-white/20 p-1.5">
                                        <label htmlFor={`gain${index}`} className="font-semibold">Ganancia:</label>
                                        <input
                                            onChange={(event) => handleChangeGain(event, index)}
                                            id={`gain${index}`}
                                            className="outline-none text-center"
                                            type="number"
                                            defaultValue='1'
                                            step="0.1"
                                            min="0"
                                            max="10"
                                        />
                                    </div>
                                    {/* ))} */}
                                </div>
                                {/* Añadir canvas para la forma de onda */}
                                {/* <canvas
                                    ref={el => canvasRefs.current[index] = el}
                                    className="border mt-4"
                                    width="500"
                                    height="100"
                                ></canvas> */}
                            </div>
                        ))}
                    </div>
                </section>
                <div className="text-blue-500 mt-6">{textAlert}</div>
                <section className="bg-blue-500 mt-16 p-4 rounded-md">
                    <h2 className="text-center text-white">Herramienta pensada para músicos, pero le puedes dar el uso que quieras.</h2>
                </section>
            </main>
        </div>
    )
}