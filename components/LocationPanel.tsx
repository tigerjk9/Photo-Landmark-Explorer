import React, { Suspense, lazy, useCallback, useState } from 'react';
import LocationMap from './LocationMap';

const LandmarkGlobe = lazy(() => import('./LandmarkGlobe'));

interface LocationPanelProps {
    latitude: number;
    longitude: number;
    name: string;
    city: string;
    country: string;
}

let webgl2Supported: boolean | null = null;

const supportsWebGL2 = () => {
    if (webgl2Supported === null) {
        try {
            const probe = document.createElement('canvas');
            const gl = probe.getContext('webgl2');
            webgl2Supported = gl !== null;
            gl?.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {
            webgl2Supported = false;
        }
    }
    return webgl2Supported;
};

// three.js 청크를 못 받거나 그리다 실패하면 기존 지도 화면으로 돌아간다.
interface GlobeBoundaryProps {
    onError: () => void;
    children: React.ReactNode;
}

class GlobeBoundary extends React.Component<GlobeBoundaryProps> {
    declare props: Readonly<GlobeBoundaryProps>;
    componentDidCatch() {
        this.props.onError();
    }
    static getDerivedStateFromError() {
        return {};
    }
    render() {
        return this.props.children;
    }
}

const GlobePlaceholder: React.FC = () => (
    <div className="w-full h-72 md:h-96 rounded-md bg-[#070d22] flex items-center justify-center text-sm text-blue-100/80">
        지구본을 불러오는 중...
    </div>
);

const LocationPanel: React.FC<LocationPanelProps> = ({ latitude, longitude, name, city, country }) => {
    const [globeFailed, setGlobeFailed] = useState(false);
    const [view, setView] = useState<'globe' | 'map'>('globe');
    const handleGlobeFailure = useCallback(() => setGlobeFailed(true), []);

    if (globeFailed || !supportsWebGL2()) {
        return <LocationMap latitude={latitude} longitude={longitude} name={name} />;
    }

    const tabClass = (active: boolean) =>
        `px-4 py-2 text-sm font-semibold rounded-full transition-colors min-h-[40px] ${
            active ? 'bg-rose-500 text-white shadow' : 'text-stone-600 hover:bg-rose-100'
        }`;

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-2xl font-semibold text-stone-800">위치</h3>
                <div className="flex gap-1 bg-stone-100 rounded-full p-1" role="group" aria-label="위치 보기 방식">
                    <button type="button" aria-pressed={view === 'globe'} className={tabClass(view === 'globe')} onClick={() => setView('globe')}>
                        지구본
                    </button>
                    <button type="button" aria-pressed={view === 'map'} className={tabClass(view === 'map')} onClick={() => setView('map')}>
                        지도 보기
                    </button>
                </div>
            </div>
            {view === 'globe' ? (
                <>
                    <GlobeBoundary onError={handleGlobeFailure}>
                        <Suspense fallback={<GlobePlaceholder />}>
                            <LandmarkGlobe
                                latitude={latitude}
                                longitude={longitude}
                                name={name}
                                place={`${city}, ${country}`}
                                onUnavailable={handleGlobeFailure}
                            />
                        </Suspense>
                    </GlobeBoundary>
                    <p className="text-xs text-stone-500 mt-2 text-center">좌우로 끌어서 지구본을 돌려 보세요.</p>
                </>
            ) : (
                <LocationMap latitude={latitude} longitude={longitude} name={name} embedded />
            )}
        </div>
    );
};

export default LocationPanel;
