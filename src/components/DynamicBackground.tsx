import React from 'react';
import Squares from './Squares';

interface DynamicBackgroundProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Dynamic Background Component
 * Uses the Squares animation to create a subtle, interactive background
 * that responds to mouse movement.
 */
const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
    children,
    className = ''
}) => {
    return (
        <div className={`min-h-screen w-full relative ${className}`} style={{ isolation: 'isolate' }}>
            {/* Background Animation */}
            <div
                className="fixed inset-0"
                style={{
                    backgroundColor: '#060606',
                    zIndex: 0
                }}
            >
                <Squares
                    direction="diagonal"
                    speed={0.5}
                    squareSize={40}
                    borderColor="#333"
                    hoverFillColor="#222"
                />
            </div>

            {/* Content - must be above background layers */}
            <div className="relative" style={{ zIndex: 10 }}>
                {children}
            </div>
        </div>
    );
};

export default DynamicBackground;
