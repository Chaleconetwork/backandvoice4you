import Link from "next/link"

export const Navbar = () => {
    return (
        <nav className="flex justify-between shadow-md responsive_navbar">
            <ul className="flex justify-center rounded-md hide_elements">
                <Link href='/'><li className="p-4">Mezclador</li></Link>
                <Link href='/'><li className="p-4">Sobre</li></Link>
                <Link href='/'><li className="p-4">Feedback</li></Link>
            </ul>
            <ul className="flex hide_elements">
                <Link href='/'><li className="p-4"><span className="bg-blue-500 text-white p-2 rounded-md">Iniciar sesión</span></li></Link>
                <Link href='/'><li className="p-4"><span className="bg-blue-500 text-white p-2 rounded-md">Registrarse</span></li></Link>
            </ul>
        </nav>
    )
}