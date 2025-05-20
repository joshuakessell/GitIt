import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ExplanationSettings } from "@/types";

interface AdvancedOptionsProps {
  settings: ExplanationSettings;
  onSettingsChange: (settings: ExplanationSettings) => void;
}

export function AdvancedOptions({ settings, onSettingsChange }: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = <K extends keyof ExplanationSettings>(
    key: K,
    value: ExplanationSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          className="flex justify-between items-center w-full text-left text-lg font-medium"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>Advanced Options</span>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
      {isOpen && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium mb-2">Explanation Detail Level</Label>
              <Select
                value={settings.detailLevel}
                onValueChange={(value) => handleChange("detailLevel", value as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Detail level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (Beginner friendly)</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="advanced">Advanced (Technical details)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-2">Include Code Comments</Label>
              <RadioGroup
                value={settings.includeComments ? "yes" : "no"}
                onValueChange={(value) => handleChange("includeComments", value === "yes")}
                className="flex items-center space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="include-comments-yes" />
                  <Label htmlFor="include-comments-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="include-comments-no" />
                  <Label htmlFor="include-comments-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-2">Output Format</Label>
              <Select
                value={settings.outputFormat}
                onValueChange={(value) => handleChange("outputFormat", value as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Output format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain text</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-2">Include</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-complexity"
                    checked={settings.includeComplexity}
                    onCheckedChange={(checked) => 
                      handleChange("includeComplexity", checked as boolean)
                    }
                  />
                  <Label htmlFor="include-complexity">Time/Space complexity</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-edge-cases"
                    checked={settings.includeEdgeCases}
                    onCheckedChange={(checked) => 
                      handleChange("includeEdgeCases", checked as boolean)
                    }
                  />
                  <Label htmlFor="include-edge-cases">Edge cases handling</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-improvements"
                    checked={settings.includeImprovements}
                    onCheckedChange={(checked) => 
                      handleChange("includeImprovements", checked as boolean)
                    }
                  />
                  <Label htmlFor="include-improvements">Potential improvements</Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
