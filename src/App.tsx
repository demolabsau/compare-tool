import React, { useState } from 'react';
import _ from 'lodash';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LuChevronRight, LuChevronDown, LuPlus, LuMinus, LuClipboardPenLine } from 'react-icons/lu';
import { convertReport, type Report, type ConversionResult } from '@/lib/convert';

type JsonValue = string | number | boolean | null | JsonArray | JsonObject;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type DiffStatus = 'same' | 'added' | 'removed' | 'modified';
type FileType = 'pre-process' | 'post-process';

interface FileWithType {
  content: JsonValue;
  type: FileType;
}

interface TreeNodeProps {
  value: JsonValue;
  otherValue: JsonValue;
  path: string;
  side: 'left' | 'right';
  level: number;
}

const App: React.FC = () => {
  const [leftFile, setLeftFile] = useState<FileWithType | null>(null);
  const [rightFile, setRightFile] = useState<FileWithType | null>(null);
  const [error, setError] = useState<string>('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const processJsonContent = (content: JsonValue, type: FileType): JsonValue => {
    if (type === 'pre-process') {
      try {
        const report = content as Report;
        const { mergedReport } = convertReport(report);
        console.log(mergedReport);
        return mergedReport;
      } catch (err) {
        console.error('Error converting report:', err);
        throw new Error('Failed to convert report format');
      }
    }
    console.log(content)
    return content;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    side: 'left' | 'right',
    type: FileType
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text) as JsonValue;
      const processedJson = processJsonContent(json, type);
      
      const fileWithType: FileWithType = {
        content: processedJson,
        type
      };

      if (side === 'left') {
        setLeftFile(fileWithType);
      } else {
        setRightFile(fileWithType);
      }
      setError('');
    } catch (err) {
      setError(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const togglePath = (path: string): void => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const compareValues = (left: JsonValue | undefined, right: JsonValue | undefined): DiffStatus => {
    if (_.isEqual(left, right)) return 'same';
    if (left === undefined) return 'added';
    if (right === undefined) return 'removed';
    if (typeof left !== typeof right) return 'modified';
    if (Array.isArray(left) !== Array.isArray(right)) return 'modified';
    return 'modified';
  };

  const renderValue = (value: JsonValue | undefined): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') return '{...}';
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  };

  const getStatusColor = (status: DiffStatus): string => {
    switch (status) {
      case 'added': return 'text-green-600';
      case 'removed': return 'text-red-600';
      case 'modified': return 'text-yellow-600';
      default: return 'text-gray-800';
    }
  };

  const getStatusIcon = (status: DiffStatus) => {
    switch (status) {
      case 'added': return <LuPlus size={16} className="text-green-600" />;
      case 'removed': return <LuMinus size={16} className="text-red-600" />;
      case 'modified': return <LuClipboardPenLine size={16} className="text-yellow-600" />;
      default: return null;
    }
  };

  const renderTreeNode = ({ value, otherValue, path, side, level }: TreeNodeProps): JSX.Element => {
    const diffStatus = compareValues(value, otherValue);
    const isExpanded = expandedPaths.has(path);
    const pathParts = path.split('.');
    const key = pathParts[pathParts.length - 1] || 'root';
    
    const isExpandable = (
      (typeof value === 'object' && value !== null) ||
      (typeof otherValue === 'object' && otherValue !== null)
    );

    const handleClick = (e: React.MouseEvent): void => {
      e.stopPropagation();
      if (isExpandable) {
        togglePath(path);
      }
    };

    return (
      <div key={`${side}-${path}`} className="py-1">
        <div 
          className={`flex items-center hover:bg-gray-50 cursor-pointer ${getStatusColor(diffStatus)}`}
          onClick={handleClick}
          style={{ marginLeft: `${level * 16}px` }}
        >
          {isExpandable && (
            <span className="mr-1">
              {isExpanded ? <LuChevronDown size={16} /> : <LuChevronRight size={16} />}
            </span>
          )}
          {getStatusIcon(diffStatus)}
          <span className="font-semibold mx-2">{key}:</span>
          <span className="font-mono text-sm">
            {!isExpanded && renderValue(value)}
          </span>
        </div>

        {isExpanded && isExpandable && value && typeof value === 'object' && (
          <div>
            {Object.entries(value).map(([childKey, childValue]) => {
              const newPath = path ? `${path}.${childKey}` : childKey;
              const otherChildValue = otherValue && typeof otherValue === 'object' ? 
                (otherValue as JsonObject)[childKey] : undefined;
              
              return renderTreeNode({
                value: childValue,
                otherValue: otherChildValue,
                path: newPath,
                side,
                level: level + 1
              });
            })}
          </div>
        )}
      </div>
    );
  };

  const FileUploadSection: React.FC<{
    side: 'left' | 'right';
    label: string;
  }> = ({ side, label }) => {
    const [fileType, setFileType] = useState<FileType>('post-process');
    
    return (
      <div className="space-y-4">
        <Input
          type="file"
          accept=".json"
          onChange={(e) => {
            handleFileUpload(e, side, fileType);
          }}
          className="mb-2"
        />
        <RadioGroup
          name={`${side}-file-type`}
          defaultValue="post-process"
          className="flex items-center space-x-4"
          onValueChange={setFileType}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pre-process" id={`${side}-pre`} />
            <Label htmlFor={`${side}-pre`}>Pre-process</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="post-process" id={`${side}-post`} />
            <Label htmlFor={`${side}-post`}>Post-process</Label>
          </div>
        </RadioGroup>
      </div>
    );
  };

  const renderComparison = (): JSX.Element | null => {
    if (!leftFile?.content || !rightFile?.content) return null;

    return (
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Left JSON ({leftFile.type})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              {renderTreeNode({
                value: leftFile.content,
                otherValue: rightFile.content,
                path: '',
                side: 'left',
                level: 0
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Right JSON ({rightFile.type})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              {renderTreeNode({
                value: rightFile.content,
                otherValue: leftFile.content,
                path: '',
                side: 'right',
                level: 0
              })}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>JSON Comparison Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex space-x-2 items-center">
              <LuPlus size={16} className="text-green-600" />
              <span>Added</span>
            </div>
            <div className="flex space-x-2 items-center">
              <LuMinus size={16} className="text-red-600" />
              <span>Removed</span>
            </div>
            <div className="flex space-x-2 items-center">
              <LuClipboardPenLine size={16} className="text-yellow-600" />
              <span>Modified</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FileUploadSection side="left" label="Left File" />
            <FileUploadSection side="right" label="Right File" />
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {renderComparison()}
    </div>
  );
};

export default App;