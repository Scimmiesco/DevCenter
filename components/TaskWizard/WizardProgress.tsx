import React from "react";

interface WizardProgressProps {
    currentStep: 1 | 2 | 3;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep }) => {
    return (
        <div className="flex items-center justify-between mb-8 px-4 relative">
            {/* Progress Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray800 -z-10 rounded overflow-hidden">
                <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: currentStep === 1 ? '10%' : currentStep === 2 ? '50%' : '100%' }}
                />
            </div>

            <div className={`flex flex-col items-center flex-1 transition-all ${currentStep >= 1 ? 'text-accent-light opacity-100' : 'text-gray500 opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 shadow-lg transition-colors ${currentStep >= 1 ? 'bg-accent text-surface' : 'bg-gray800 text-gray500'}`}>1</div>
                <span className="text-xs font-bold uppercase tracking-wider text-center bg-surface px-2">Contexto</span>
            </div>
            <div className={`flex flex-col items-center flex-1 transition-all ${currentStep >= 2 ? 'text-accent-light opacity-100' : 'text-gray500 opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 shadow-lg transition-colors ${currentStep >= 2 ? 'bg-accent text-surface' : 'bg-gray800 text-gray500'}`}>2</div>
                <span className="text-xs font-bold uppercase tracking-wider text-center bg-surface px-2">Código</span>
            </div>
            <div className={`flex flex-col items-center flex-1 transition-all ${currentStep >= 3 ? 'text-accent-light opacity-100' : 'text-gray500 opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 shadow-lg transition-colors ${currentStep >= 3 ? 'bg-accent text-surface' : 'bg-gray800 text-gray500'}`}>3</div>
                <span className="text-xs font-bold uppercase tracking-wider text-center bg-surface px-2">Gerar</span>
            </div>
        </div>
    );
};
