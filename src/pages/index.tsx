import { CustomAlert } from "@/components/customAlert";
import { bufferToWave, loadAudioBuffers, mixAudios, pauseAudios, playAudios, resumeAudios } from "@/utils/funcs/audioControls";
import { ChangeEvent, useEffect, useState } from "react"

export default function Home() {
    const [audioBuffers, setAudioBuffers] = useState<{ audioBuffer1: AudioBuffer, audioBuffer2: AudioBuffer } | null>();
    const [isDownloadEnabled, setIsDownloadEnabled] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [gain1, setGain1] = useState<number>(1);
    const [gain2, setGain2] = useState<number>(1);
    const [textAlert, setTextAlert] = useState<string>('')

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length > 2) return;
        const fileNamesList = Array.from(files).map(file => file.name);
        setFileNames(prev => [...prev, ...fileNamesList])

        const fileArray = Array.from(files);
        setSelectedFiles(prev => {
            const newSelectedFiles = [...prev, ...fileArray];          
            if (newSelectedFiles.length === 2)
                setIsDownloadEnabled(true)
            return newSelectedFiles;
        })    
    };

    async function loadAudios() {
        try {
            if (selectedFiles.length < 2) return
            const buffers = await Promise.all(selectedFiles.map(file => file.arrayBuffer()));
            const loadedBuffers = await loadAudioBuffers(buffers[0], buffers[1]);
            setAudioBuffers(loadedBuffers);
        } catch (error) {
            console.error("Error loading audio buffers:", error);
        }
    }

    const handlePlay = () => {
        if (audioBuffers && audioBuffers.audioBuffer1 && audioBuffers.audioBuffer2) {
            pauseAudios()
            playAudios(audioBuffers.audioBuffer1, audioBuffers.audioBuffer2);
        } else {
            console.error('No hay ningun archivo de audio cargado')
        }
    };

    const handlePause = () => {
        pauseAudios()
    }

    const handleResume = () => {
        if (audioBuffers && audioBuffers.audioBuffer1 && audioBuffers.audioBuffer2) {
            resumeAudios(audioBuffers.audioBuffer1, audioBuffers.audioBuffer2)
        }
    }

    const handleGainChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target;
        const newValue = parseFloat(value);

        if (id === 'gain1') {
            setGain1(newValue);
        } else if (id === 'gain2') {
            setGain2(newValue);
        }
    }

    const MixAndDownload = async () => {
        if (!audioBuffers) {
            console.error("No hay buffers de audio cargados.");
            return;
        }

        try {
            const mixedBuffer =  await mixAudios(audioBuffers.audioBuffer1, audioBuffers.audioBuffer2, gain1, gain2);
            const wavBlob = bufferToWave(mixedBuffer, mixedBuffer.length);
            const url = URL.createObjectURL(wavBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = "audio_mezclado.wav";
            link.style.display = 'none';
            document.body.appendChild(link);

            link.click();
            link.remove()
            // document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error mixing and downloading audio:", error);
        }
    };

    const handleDownloadClick = async () => {
        console.log(isDownloadEnabled)
        try {
            if (isDownloadEnabled)
                await MixAndDownload();
            if (!isDownloadEnabled)
                setTextAlert('Debes cargar mínimo 2 audios para usar esta opción')
        } catch (error) {
            console.error("Error during download:", error);
        }
    };

    useEffect(() => {
        loadAudios()
    }, [selectedFiles, gain1, gain2])

    return (
        <div className="w-[80%] mx-auto">            
            <h1 className="font-bold text-5xl text-center uppercase mt-16">Back & Voice 4 You</h1>
            <h3 className="text-center text-xl mt-2">Mezcla audios para que suenen simultaneamente en un solo archivo</h3>
            <main className="mt-10">
                <section className="border-2 rounded-md p-4 mb-4">
                    <h2 className="text-lg font-semibold mb-2">Panel de control</h2>
                    <button onClick={handlePlay} className="hover:shadow-md hover:shadow-blue-200 transition delay-100 duration-300 ease-in-out border mt-2 mr-3 p-2 rounded-md font-semibold cursor-pointer">Reproducir Mezcla</button>
                    <button onClick={handlePause} className="hover:shadow-md hover:shadow-blue-200 transition delay-100 duration-300 ease-in-out border mt-2 mr-3 p-2 rounded-md font-semibold cursor-pointer">Pausar</button>
                    <button onClick={handleResume} className="hover:shadow-md hover:shadow-blue-200 transition delay-100 duration-300 ease-in-out border mt-2 mr-3 p-2 rounded-md font-semibold cursor-pointer">Reanudar</button>
                    <div className="border rounded-md text-center mt-2 mr-3 inline-block p-2">
                        <label htmlFor="gain1" className="p-2 rounded-md font-semibold mr-3">Ganancia Audio 1:</label>
                        <input onChange={handleGainChange} id="gain1" className="outline-none text-center" type="number" defaultValue='1' step="0.1" min="0" max="10" />
                    </div>
                    <div className="border rounded-md text-center mt-2 mr-3 inline-block p-2">
                        <label htmlFor="gain2" className="p-2 rounded-md font-semibold mr-3">Ganancia Audio 2:</label>
                        <input onChange={handleGainChange} id="gain2" className="outline-none text-center" type="number" defaultValue='1' step="0.1" min="0" max="10" />
                    </div>
                    <button
                        onClick={() => handleDownloadClick()}
                        className={`border mt-2 mr-3 p-2 rounded-md font-semibold ${isDownloadEnabled ? 'bg-green-500 opacity-100 text-white cursor-pointer' : 'cursor-default opacity-55'}`}
                    >
                        Descargar Audio Mezclado
                    </button>
                </section>
                <section className="border-2 rounded-md p-4">
                    <h2 className="text-lg font-semibold mb-4">Visualización de audios</h2>
                    <div>
                        <label htmlFor="files" className="shadow-md hover:shadow-blue-500 hover:bg-blue-400 transition delay-100 duration-300 ease-in-out p-2 rounded-md font-semibold cursor-pointer shadow-blue-500 bg-blue-500 text-white">
                            Agregar audio
                        </label>
                        <input id="files" multiple onChange={handleFileChange} className="hidden" type="file" />
                        <div className="block mt-4">
                            <h3 className="font-semibold text-lg">Audios cargados</h3>
                            <h3 className="">{fileNames[0] && fileNames[0]} </h3>
                            <h3 className="">{fileNames[1] && fileNames[1]} </h3>
                        </div>
                    </div>
                </section>
                <div className="text-blue-500 mt-6">{textAlert}</div>
                <section className="bg-blue-500 mt-16 p-4 rounded-md">
                    <h2 className="text-center text-white">Lorem ipsum dolor sit amet consectetur, adipisicing elit. Perferendis unde nobis reiciendis, adipisci veniam animi magnam expedita laborum, quisquam voluptatum quas, saepe corporis temporibus commodi libero amet laudantium fugiat! Porro.</h2>
                </section>
            </main>
        </div>
    )
}