import { Navbar } from "@/components/navbar";
import type { AppProps } from "next/app";
import '@fontsource-variable/rubik'; // Supports weights 300-900
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Navbar />
            <Component {...pageProps} />;
        </>
    )
}
