declare namespace AMap {
	class Map {
		constructor(container: HTMLElement | null, options: any);
		addControl(control: any): void;
		setCenter(position: [number, number]): void;
		on(event: string, handler: Function): void;
		destroy(): void;
		lngLatToContainer(lnglat: any): any;
	}

	class Marker {
		constructor(options: { position: [number, number]; map?: Map | undefined; icon?: Icon });
		setPosition(position: [number, number]): void;
		setMap(map: Map | null): void;
		setIcon(icon: Icon): void;
		on(event: string, handler: Function): void;
		getPosition(): any;
	}

	class Icon {
		constructor(options: {
			size: Size;
			image: string;
			imageSize: Size;
		});
	}

	class Size {
		constructor(width: number, height: number);
	}

	class InfoWindow {
		constructor(options: any);
		setContent(content: HTMLElement): void;
		open(map: Map, position: any): void;
	}

	class Geolocation {
		constructor(options: any);
		getCurrentPosition(callback: (status: string, result: any) => void): void;
	}

	class Driving {
		constructor(options: any);
		search(start: [number, number], end: [number, number], options: any, callback: (status: string, result: any) => void): void;
		clear(): void;
	}

	class Walking {
		constructor(options: any);
		search(start: [number, number], end: [number, number], callback: (status: string, result: any) => void): void;
		clear(): void;
	}

	const DrivingPolicy: {
		LEAST_TIME: number;
	};

	class Pixel {
		constructor(x: number, y: number);
	}

	class PlaceSearch {
		constructor(options: any);
		search(keyword: string, callback: (status: string, result: any) => void): void;
	}
} 