import { cn } from "@/lib/utils";
import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg",
                        "text-gray-900 placeholder-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent",
                        "transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
                        error && "border-red-500 focus:ring-red-500",
                        className
                    )}
                    {...props}
                />
                {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, id, children, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg",
                        "text-gray-900",
                        "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent",
                        "transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
                        error && "border-red-500 focus:ring-red-500",
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
            </div>
        );
    }
);

Select.displayName = "Select";

export { Input, Select };

