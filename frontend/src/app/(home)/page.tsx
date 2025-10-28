"use client"
const Home = () => {
    const name = localStorage.getItem('name');
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
        <p>Olá {name}</p>
    </div>
  );
}

export default Home;
