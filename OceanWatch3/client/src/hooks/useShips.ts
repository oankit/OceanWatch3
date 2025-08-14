import { ShipContext } from "@/providers/ShipProvider";
import { useContext } from "react";

export const useShips = () => {
    const context = useContext(ShipContext);
    if (context === undefined) {
      throw new Error("useShips must be used within a ShipProvider");
    }
    return context;
};