import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  date?: Date;
  value?: string; // HH:MM format
  onChange?: (time: string) => void;
  className?: string;
}

// Custom scrollable container component
const ScrollContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { height: string }
>(({ children, height, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  React.useImperativeHandle(ref, () => containerRef.current!);

  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (containerRef.current) {
      containerRef.current.scrollTop += e.deltaY;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{ 
        height, 
        overflowY: 'scroll',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}
      className="scroll-container"
      {...props}
    >
      <style>{`
        .scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {children}
    </div>
  );
});
ScrollContainer.displayName = "ScrollContainer";

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState<string>("09");
  const [selectedMinute, setSelectedMinute] = React.useState<string>("00");

  const hourScrollRef = React.useRef<HTMLDivElement>(null);
  const minuteScrollRef = React.useRef<HTMLDivElement>(null);

  // Parse value on change
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      if (h) setSelectedHour(h);
      if (m) setSelectedMinute(m);
    }
  }, [value]);

  // Scroll to selected items ONLY when opening
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (hourScrollRef.current) {
          const selectedHourEl = hourScrollRef.current.querySelector(`[data-value="${selectedHour}"]`) as HTMLElement;
          if (selectedHourEl) {
            hourScrollRef.current.scrollTop = selectedHourEl.offsetTop - 60;
          }
        }
        if (minuteScrollRef.current) {
          const selectedMinuteEl = minuteScrollRef.current.querySelector(`[data-value="${selectedMinute}"]`) as HTMLElement;
          if (selectedMinuteEl) {
            minuteScrollRef.current.scrollTop = selectedMinuteEl.offsetTop - 60;
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "30"];

  const handleTimeChange = (type: "hour" | "minute", val: string) => {
    let newHour = selectedHour;
    let newMinute = selectedMinute;

    if (type === "hour") {
      newHour = val;
      setSelectedHour(val);
    } else {
      newMinute = val;
      setSelectedMinute(val);
    }

    if (onChange) {
      onChange(`${newHour}:${newMinute}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || "Select time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x">
          {/* Hours Column */}
          <div className="flex flex-col w-[70px]">
            <div className="p-2 text-center text-sm font-medium text-muted-foreground border-b bg-background">Hr</div>
            <ScrollContainer ref={hourScrollRef} height="160px">
              <div className="flex flex-col p-1 gap-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    data-value={hour}
                    variant={selectedHour === hour ? "default" : "ghost"}
                    size="sm"
                    className="w-full shrink-0"
                    onClick={() => handleTimeChange("hour", hour)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollContainer>
          </div>
          {/* Minutes Column */}
          <div className="flex flex-col w-[70px]">
            <div className="p-2 text-center text-sm font-medium text-muted-foreground border-b bg-background">Min</div>
            <ScrollContainer ref={minuteScrollRef} height="160px">
              <div className="flex flex-col p-1 gap-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    data-value={minute}
                    variant={selectedMinute === minute ? "default" : "ghost"}
                    size="sm"
                    className="w-full shrink-0"
                    onClick={() => handleTimeChange("minute", minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </ScrollContainer>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
