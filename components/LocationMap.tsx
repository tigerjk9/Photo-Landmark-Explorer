import React from 'react';

interface LocationMapProps {
    latitude: number;
    longitude: number;
    name: string;
}

const LocationMap: React.FC<LocationMapProps> = ({ latitude, longitude, name }) => {
    const mapSrc = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">위치</h3>
            <div className="relative w-full h-96 overflow-hidden rounded-md border border-stone-200">
                <iframe
                    title={`Map of ${name}`}
                    src={mapSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
            </div>
        </div>
    );
};

export default LocationMap;