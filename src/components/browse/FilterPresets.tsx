import React from 'react';
import { FilterPreset } from '../../types/browse';

interface FilterPresetsProps {
    presets: FilterPreset[];
    onApply: (presetId: string) => void;
}

const FilterPresets: React.FC<FilterPresetsProps> = ({ presets, onApply }) => {
    return (
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3">
                {presets.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => onApply(preset.id)}
                        className="group flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors duration-150"
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">
                            {preset.icon}
                        </span>
                        <div className="text-left">
                            <div className="text-sm font-semibold text-white">{preset.name}</div>
                            <div className="text-xs text-gray-400">{preset.description}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FilterPresets;
