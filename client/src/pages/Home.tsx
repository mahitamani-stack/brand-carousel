import { CarouselScene } from "@/components/CarouselScene";

export default function Home() {
    return (
    <div className="w-full bg-black" style={{ paddingTop: '10px', paddingBottom: '30px' }}>
      <div className="text-center pb-3">
        <h1 className="font-serif text-5xl font-light text-white">
          Our <em>Clients</em>
        </h1>
      </div>
      <CarouselScene />
    </div>
  );
}
