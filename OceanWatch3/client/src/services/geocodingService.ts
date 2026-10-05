import { Service } from "@/lib/serviceRoot";

export enum Biome {
    Tropical = 'Tropical',
    Temperate = 'Temperate',
    Boreal = 'Boreal',
    Savanna = 'Savanna',
    Tundra = 'Tundra',
    Desert = 'Desert',
    Water = 'Water',
}

export type LandInfoResponse = {
    name: string;
    biome: {
        biome_category: Biome;
        biome_name: string;
        eco_name: string;
    }
}

export interface BatchCoordinate {
    lat: number;
    lon: number;
}

export interface BatchLandInfoResponse {
    results: LandInfoResponse[];
}

export type PlaceAutocompleteResponse = {
    predictions: Array<{
        description: string;
        matched_substrings: Array<{
            length: number;
            offset: number;
        }>;
        place_id: string;
        reference: string;
        structured_formatting: {
            main_text: string;
            main_text_matched_substrings: Array<{
                length: number;
                offset: number;
            }>;
            secondary_text: string;
        };
        terms: Array<{
            offset: number;
            value: string;
        }>;
        types: string[];
    }>;
    status: string;
}

export type PlaceDetailsResponse = {
    html_attributions: any[];
    result: {
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
            viewport: {
                northeast: {
                    lat: number;
                    lng: number;
                };
                southwest: {
                    lat: number;
                    lng: number;
                };
            };
        };
    };
    status: string;
}


export type LandNameResponse = {
    name: string;
}

export type BiomeResponse = {
    biome: {
        biome_category: Biome;
        biome_name: string;
        eco_name: string;
    }
}

class GeocodingService extends Service {
    constructor() {
		super('/');
	}

    async completeLocation(input: string) {
        const requestConfig = this.applyHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, {
            input,
            key: 'AIzaSyCdBjusXqkGcRyR9TNz5Qco0r14lcbv7zM', 
            locationbias: 'ipbias'
        });

        return this.safeAxiosApply<PlaceAutocompleteResponse>(
            async () => this.instance.get('https://cors-proxy.windbornesystems.com/proxy/https/maps.googleapis.com/maps/api/place/autocomplete/json', {
                ...requestConfig,
                withCredentials: false
            })
        )();
    }

    async getPlaceDetails(placeId: string) {
        const requestConfig = this.applyHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, {
            place_id: placeId,
            key: 'AIzaSyCdBjusXqkGcRyR9TNz5Qco0r14lcbv7zM',
            fields: 'geometry'
        });
        
        return this.safeAxiosApply<PlaceDetailsResponse>(
            async () => this.instance.get('https://cors-proxy.windbornesystems.com/proxy/https/maps.googleapis.com/maps/api/place/details/json', {
                ...requestConfig,
                withCredentials: false
            })
        )();
    }

    // Place name for a position via Mapbox reverse geocoding; open water has no match
    async getLandInfo(lat: number, lng: number): Promise<{ name: string }> {
        try {
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            const res = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=place,region,country&limit=1&access_token=${token}`);
            const props = (await res.json())?.features?.[0]?.properties;
            return { name: props ? (props.full_address || props.name) : 'At sea' };
        } catch {
            return { name: '' };
        }
    }

    async getBatchLandInfo(coordinates: BatchCoordinate[]) {
        const requestConfig = this.applyHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }, {});
        
        return this.safeAxiosApply<BatchLandInfoResponse>(
            async () => this.instance.post('https://geoinfo-windborne.onrender.com/api/v1/batch/land_info', {
                coordinates
            }, {
                ...requestConfig,
                withCredentials: false
            })
        )();
    }
}

const geocodingService = new GeocodingService();

export default geocodingService;