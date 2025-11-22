import { useParams, useNavigate } from "react-router";
import { ArrowLeft, SquareFunction, Code2, Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormulaDefinition } from "@/types/formula";

// Mock formula data - replace with actual data fetching
const mockFormula: FormulaDefinition = {
  id: "funding_fee",
  name: "Funding Fee Calculation",
  version: "1.0.0",
  description: "Calculate the funding fee for a perpetual futures position",
  formula: "Funding Fee = Notional Value * Funding Rate * Time Fraction",
  tags: ["trading", "funding", "perpetual"],
  creationType: "builtin",
  inputs: [
    {
      key: "notionalValue",
      type: "number",
      factorType: {
        baseType: "number",
        constraints: { min: 0 }
      },
      unit: "USD",
      description: "The notional value of the position"
    },
    {
      key: "fundingRate",
      type: "number",
      factorType: {
        baseType: "number"
      },
      unit: "%",
      description: "The current funding rate"
    },
    {
      key: "timeFraction",
      type: "number",
      factorType: {
        baseType: "number",
        constraints: { min: 0, max: 1 }
      },
      description: "Fraction of the funding period that has elapsed"
    }
  ],
  outputs: [
    {
      key: "result",
      type: "number",
      factorType: {
        baseType: "number"
      },
      unit: "USD",
      description: "The calculated funding fee"
    }
  ],
  examples: [
    {
      inputs: {
        notionalValue: 10000,
        fundingRate: 0.0001,
        timeFraction: 0.5
      },
      outputs: {
        result: 0.5
      }
    }
  ]
};

export function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // In a real implementation, fetch formula data based on ID
  // TODO: Use the id parameter to fetch actual formula data
  console.log('Formula ID:', id); // Temporary to use the variable
  const formula = mockFormula;

  const handleCopyFormula = async () => {
    const formulaText = `${formula.name}\n\n${formula.description}\n\nFormula: ${formula.formula}\n\nInputs:\n${formula.inputs.map(input => `- ${input.key}: ${input.description}`).join('\n')}\n\nOutputs:\n${formula.outputs.map(output => `- ${output.key}: ${output.description}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(formulaText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy formula:', err);
    }
  };

  const getCreationIcon = (creationType?: string) => {
    switch (creationType) {
      case "parsed":
        return Code2;
      case "imported":
        return Download;
      default:
        return SquareFunction;
    }
  };

  const CreationIcon = getCreationIcon(formula.creationType);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <CreationIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold">{formula.name}</h1>
          </div>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFormula}
            className="flex items-center gap-2"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Formula"}
          </Button>
        </div>

        {/* Formula Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overview</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded text-xs">
                  v{formula.version}
                </span>
                {formula.tags && formula.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-muted rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{formula.description}</p>
            {formula.formula && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Formula:</h4>
                <code className="text-sm">{formula.formula}</code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Information */}
        <Tabs defaultValue="inputs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="inputs">
            <Card>
              <CardHeader>
                <CardTitle>Input Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formula.inputs.map((input, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold font-mono">{input.key}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {input.type}
                          </span>
                          {input.unit && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                              {input.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {input.description}
                      </p>
                      {input.default !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Default: <code>{String(input.default)}</code>
                        </p>
                      )}
                      {input.factorType.constraints && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Constraints: {JSON.stringify(input.factorType.constraints)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outputs">
            <Card>
              <CardHeader>
                <CardTitle>Output Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formula.outputs.map((output, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold font-mono">{output.key}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {output.type}
                          </span>
                          {output.unit && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                              {output.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {output.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples">
            <Card>
              <CardHeader>
                <CardTitle>Usage Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formula.examples?.map((example, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Example {index + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-sm mb-2">Inputs:</h5>
                          <div className="space-y-1">
                            {Object.entries(example.inputs).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="font-mono">{key}:</span>
                                <span className="font-mono text-blue-600">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm mb-2">Outputs:</h5>
                          <div className="space-y-1">
                            {Object.entries(example.outputs).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="font-mono">{key}:</span>
                                <span className="font-mono text-green-600">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!formula.examples || formula.examples.length === 0) && (
                    <p className="text-muted-foreground">No examples available for this formula.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}