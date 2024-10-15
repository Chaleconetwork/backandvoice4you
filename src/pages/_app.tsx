import { Navbar } from "@/components/navbar";
import type { AppProps } from "next/app";
import '@fontsource-variable/rubik'; // Supports weights 300-900
import "@/styles/globals.css";
import { Footer } from "@/components/footer";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <div className="flex flex-col h-screen">
            <Navbar />
            <div className="grow">
                <Component {...pageProps} />
            </div>
            <Footer />
        </div>
    )
}
