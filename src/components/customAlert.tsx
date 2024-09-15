interface Props {
    text: string;
    // value: boolean;
}

export const CustomAlert = ({ text }: Props) => {
    return (
        <div className={`${'absolute right-10 border p-4 rounded-md  w-[250px]'}`}>
            <span>{text}</span>
        </div>
    )
}