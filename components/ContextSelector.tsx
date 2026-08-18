import React from "react";
import { UserContext, SeniorityLevel, RoleType } from "../types";
import { Users, BookOpen } from "lucide-react";

interface ContextSelectorProps {
  context: UserContext;
  onChange: (ctx: UserContext) => void;
  className?: string;
}

export const ContextSelector: React.FC<ContextSelectorProps> = ({
  context,
  onChange,
  className,
}) => {
  const update = (field: keyof UserContext, value: any) => {
    onChange({ ...context, [field]: value });
  };

  return (
    <div className={`container-destacado flex flex-col p-2 gap-2 space-y-2 `}>
      <div className="absolute -top-20 right-0 w-64 h-48 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
      <h3 className="text-xs font-bold uppercase text-accent-light flex items-center gap-2">
        <BookOpen className="text-accent" size={24} /> Contexto Profissional
      </h3>
      <div className="space-y-2">
        {/* Seniority */}
        <div>
          <label className="text-xs text-accent-light p-2 block">
            Senioridade
          </label>
          <div className="flex bg-surface rounded-md p-2 border-2">
            {(["Junior", "Mid-Level", "Senior"] as SeniorityLevel[]).map(
              (level) => (
                <button
                  key={level}
                  onClick={() => update("seniority", level)}
                  className={`flex-1 py-1 text-xs  font-bold cursor-pointer rounded-md transition-all ${
                    context.seniority === level
                      ? "bg-accent text-surface "
                      : "text-accent-light hover:text-accent"
                  }`}
                >
                  {level}
                </button>
              )
            )}
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="text-xs text-accent-light p-2 block">
            Papel / Stack
          </label>
          <select
            value={context.role}
            onChange={(e) => update("role", e.target.value as RoleType)}
            className="w-full "
          >
            <option value="Frontend">Frontend Developer</option>
            <option value="Backend">Backend Developer</option>
            <option value="Fullstack">Fullstack Developer</option>
          </select>
        </div>

        {/* HR Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-1 rounded-md transition-colors ${
                context.isHRMode
                  ? "bg-accent text-surface"
                  : "bg-gray800 text-accent-light"
              }`}
            >
              <Users size={16} />
            </div>
            <span className="text-xs text-accent-light">
              Modo RH (3ª Pessoa)
            </span>
          </div>
          <button
            onClick={() => update("isHRMode", !context.isHRMode)}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              context.isHRMode ? "bg-accent" : "bg-surface"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-3 h-3 rounded-full transition-transform ${
                context.isHRMode
                  ? "translate-x-5 bg-surface "
                  : "translate-x-0 bg-accent-light"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
