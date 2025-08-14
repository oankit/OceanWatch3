import type { ShipPosition } from "@/services/shipService";
import { shipService } from "@/services/shipService";
import { AxiosError } from "axios";
import { createContext, Dispatch, ReactNode, SetStateAction, useEffect, useState } from "react";

type ShipContextType = {
  ships: ShipPosition[];
  refreshShips: () => Promise<void>;
  selectedShip: string | null;
  setSelectedShip: Dispatch<SetStateAction<string | null>>;
};

export const ShipContext = createContext<ShipContextType | undefined>(undefined);

export const ShipProvider = ({ children }: { children: ReactNode }) => {
  const [ships, setShips] = useState<ShipPosition[]>([]);
  const [selectedShip, setSelectedShip] = useState<string | null>(null);

  const fetchShips = async () => {
    try {
      const res = await shipService.getShipPositions();
      setShips(res.data);
    } catch (err) {
      const e = err as AxiosError;
      console.error('Failed to fetch ships', e.message);
    }
  };

  useEffect(() => {
    fetchShips();
  }, []);

  return (
    <ShipContext.Provider value={{ ships, refreshShips: fetchShips, selectedShip, setSelectedShip }}>
      {children}
    </ShipContext.Provider>
  );
};
