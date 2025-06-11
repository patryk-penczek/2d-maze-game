import Image from "next/image";

export const Background = () => {
  return (
    <Image
      src="/background.svg"
      alt="Background"
      fill
      className="object-cover opacity-80"
      /> 
  );
};
