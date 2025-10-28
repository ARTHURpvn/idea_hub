"use client"

import { useAuthStore } from "@/zustand_store/auth_store";

const Home = () => {
    const name= useAuthStore((state) => (state?.name))

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
        <p>Olá {name}</p>
    </div>
  );
}

export default Home;
