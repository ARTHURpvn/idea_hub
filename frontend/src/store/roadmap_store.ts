import { create } from "zustand";
import {createRoadmap, getAllRoadmaps, Roadmap} from "../requests/roadmap_reqs";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";

interface RoadmapStore {
    createdRoadmap: number,
    roadmaps: Roadmap[],
}

interface RoadmapStoreActions {
    mapRoadmaps: () => Promise<void>,
    createRoadmap: (id: string, exported_to: string) => Promise<void>,
    setNull: () => void,
}

export const useRoadmapStore = create<RoadmapStore & RoadmapStoreActions>()(
    persist(
        (set) => ({
            createdRoadmap: 0,
            roadmaps: [],

            mapRoadmaps: async() => {
                const res = await getAllRoadmaps()
                if (!res) return
                set({roadmaps: res})
                set({createdRoadmap: res.length})
            },
            createRoadmap: async(id: string, exported_to: string) => {
                const res = await createRoadmap(id, exported_to)
                if (res) toast.success("Roadmap criada com sucesso")
            },
            setNull: () => {
                set({
                    createdRoadmap: 0,
                    roadmaps: [],
                })
            },
        }),
        {
            name: "roadmap-storage",
                storage: createJSONStorage(() =>
            typeof window !== "undefined" && typeof window.localStorage !== "undefined"
                ? window.localStorage
                : {
                    getItem: (_key: string) => null,
                    setItem: (_key: string, _value: string) => {},
                    removeItem: (_key: string) => {},
                }
        ),
        }
    )
)