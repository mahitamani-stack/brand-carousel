import { CarouselScene } from "@/components/CarouselScene";

export default function Home() {
  return (
    <div className="w-full bg-black" style={{ paddingTop: '10px', paddingBottom: '30px' }}>
      <div className="text-center" style={{ paddingBottom: '8px' }}>
        <h1 className="font-serif text-2xl font-light text-white">
          Our <em>Clients</em>
        </h1>
      </div>
      <CarouselScene />
    </div>
  );
}
