import { CarouselScene } from "@/components/CarouselScene";

export default function Home() {
  return (
    <div className="w-full h-screen bg-black">
            <CarouselScene />
      <div className="absolute bottom-[28%] left-0 right-0 z-10 text-center pointer-events-none">
        <h1 className="font-serif text-5xl font-light text-white">
          Our <em>Clients</em>
        </h1>
      </div>
    </div>
  );
}
