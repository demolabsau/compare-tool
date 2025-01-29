import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LuChevronRight, LuChevronDown, LuPlus, LuMinus, LuClipboardPenLine, LuSave } from 'react-icons/lu';
import { convertReport, type Report } from '@/lib/convert';
import type { JsonValue, FileType, DiffStatus, JsonObject } from '@/types';
import { compareObjects } from './lib/compare';
import correctResult from '@/assets/correct_result.json';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
// import ReportModal from './Modal';

// Properties to ignore during comparison
export const IGNORED_PROPERTIES = ['id', 'source_entity', 'target_entity', 'dropped_columns', 'entity_value', 'operation_description'];

interface FileWithType {
  content: JsonValue;
  type: FileType;
  name: string;
}

interface TreeNodeProps {
  value: JsonValue;
  otherValue: JsonValue | undefined;
  path: string;
  side: 'left' | 'right';
  level: number;
}

const App: React.FC = () => {
  const [leftFile, setLeftFile] = useState<FileWithType | null>(null);
  const [rightFile, setRightFile] = useState<FileWithType | null>(null);
  const [error, setError] = useState<string>('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [hoveredPath, setHoveredPath] = useState<string>('#');
  // const [modalOpen, setModalOpen] = useState(false);

  // const handleFileSelect = (file, position) => {
  //   if (position === 'left') {
  //     setLeftFile({
  //       content: processJsonContent(file, 'pre-process'),
  //       type: 'pre-process',
  //       name: file.name
  //     });
  //   } else {
  //     setRightFile({
  //       content: processJsonContent(file, 'pre-process'),
  //       type: 'pre-process',
  //       name: file.name
  //     });
  //   }
  // };

  const processJsonContent = (content: JsonValue, type: FileType): JsonValue => {
    if (type === 'pre-process') {
      try {
        const report = content as Report;
        const { mergedReport } = convertReport(report);
        return mergedReport;
      } catch (err) {
        console.error('Error converting report:', err);
        throw new Error('Failed to convert report format');
      }
    }
    return content;
  };

  const compareResult = useMemo(() => {
    if (!leftFile?.content || !rightFile?.content) return null;

    return compareObjects(leftFile.content, rightFile.content, IGNORED_PROPERTIES);
  }, [leftFile, rightFile]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'left' | 'right',
    type: FileType
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // try {
    const text = await file.text();
    const json = JSON.parse(text) as JsonValue;
    const processedJson = processJsonContent(json, type);
    const fileName = file.name;

    const fileWithType: FileWithType = {
      content: processedJson,
      name: fileName,
      type
    };

    if (side === 'left') {
      setLeftFile(fileWithType);
    } else {
      setRightFile(fileWithType);
    }
    setError('');
    // } catch (err) {
    //   setError(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    // }
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

  const toggleHover = (path: string): void => {
    setHoveredPath(path);
  };

  const compareValues = (left: JsonValue | undefined, right: JsonValue | undefined, currentPath: string = ''): DiffStatus => {
    // Handle undefined cases
    if (left === undefined) return 'added';
    if (right === undefined) return 'removed';

    // If both values are objects (but not arrays), compare their properties recursively
    if (typeof left === 'object' && typeof right === 'object' &&
      left !== null && right !== null &&
      !Array.isArray(left) && !Array.isArray(right)) {

      const leftObj = left as JsonObject;
      const rightObj = right as JsonObject;

      // Get all unique keys from both objects
      const allKeys = Array.from(new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]));

      // Check each property recursively
      for (const key of allKeys) {
        // Skip if the property is in the ignored list
        if (IGNORED_PROPERTIES.includes(key)) continue;

        // Compare the property values recursively
        const propertyPath = currentPath ? `${currentPath}.${key}` : key;
        const status = compareValues(leftObj[key], rightObj[key], propertyPath);

        // If any property is different, the objects are different
        if (status !== 'same') {
          return 'modified';
        }
      }

      return 'same';
    }

    // For arrays, compare each element recursively
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) return 'modified';

      for (let i = 0; i < left.length; i++) {
        const status = compareValues(left[i], right[i], `${currentPath}[${i}]`);
        if (status !== 'same') {
          return 'modified';
        }
      }

      return 'same';
    }

    // For primitive values, use direct comparison
    return _.isEqual(left, right) ? 'same' : 'modified';
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

  const renderTreeNode = ({ level, otherValue, path, side, value }: TreeNodeProps): JSX.Element => {
    const diffStatus = compareValues(value, otherValue, path);
    const isExpanded = expandedPaths.has(path);
    const isHovered = hoveredPath === path;
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

    const handleHover = (e: React.MouseEvent): void => {
      e.stopPropagation();
      toggleHover(path);
    };

    const handleUnhover = (e: React.MouseEvent): void => {
      e.stopPropagation();
      setHoveredPath('#');
    }

    // If this is an ignored property, show it in gray
    const isIgnoredProperty = IGNORED_PROPERTIES.includes(key);
    const statusColor = isIgnoredProperty ? 'text-gray-400' : getStatusColor(diffStatus);

    return (
      <div key={`${side}-${path}`} className="py-1">
        <div
          className={`flex items-center cursor-pointer ${statusColor} ${isHovered ? 'bg-yellow-100' : 'hover:bg-gray-50'}`}
          onClick={handleClick}
          onMouseEnter={handleHover}
          onMouseLeave={handleUnhover}
          style={{ marginLeft: `${level * 16}px` }}
        >
          {isExpandable && (
            <span className="mr-1">
              {isExpanded ? <LuChevronDown size={16} /> : <LuChevronRight size={16} />}
            </span>
          )}
          {!isIgnoredProperty && getStatusIcon(diffStatus)}
          <span className="font-semibold mx-2">{key}:</span>
          <span className="font-mono text-sm">
            {!isExpanded && renderValue(value)}
          </span>
          {isIgnoredProperty && (
            <span className="ml-2 text-xs text-gray-400">(ignored in comparison)</span>
          )}
        </div>

        {isExpanded && isExpandable && value && typeof value === 'object' && (
          <div>
            {Object.entries(value)
              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
              .map(([childKey, childValue]) => {
                const newPath = path ? `${path}.${childKey}` : childKey;
                const otherChildValue = otherValue && typeof otherValue === 'object' ?
                  (otherValue as JsonObject)[childKey] : undefined;

                return renderTreeNode({
                  level: level + 1,
                  otherValue: otherChildValue,
                  path: newPath,
                  side,
                  value: childValue
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
  }> = ({ side }) => {
    const [fileType, setFileType] = useState<FileType>('post-process');

    return (
      <div className='border p-4 rounded-md'>
        <h2 className='text-lg font-semibold mb-6'>{side.toLocaleUpperCase()} File</h2>
        <RadioGroup
          name={`${side}-file-type`}
          defaultValue="post-process"
          className="flex items-center space-x-4 mb-4"
          onValueChange={(value) => setFileType(value as FileType)}
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
        <Input
          type="file"
          accept=".json"
          onChange={(e) => {
            handleFileUpload(e, side, fileType);
          }}
          className="mb-2"
        />
        Or &nbsp;&nbsp;
        <Button variant="default" className='mt-6' onClick={() => {
          if (side === 'left') {
            setLeftFile({
              content: correctResult,
              type: 'post-process',
              name: 'correct_result.json'
            });
          } else {
            setRightFile({
              content: correctResult,
              type: 'post-process',
              name: 'correct_result.json'
            });
          }
        }}>Load Reference JSON</Button>
      </div>
    );
  };

  const renderComparison = (): JSX.Element | null => {
    return (
      <div className="grid grid-cols-2 gap-2 flex-1 max-w-7xl mx-auto my-4">
        {
          (leftFile && !(leftFile && rightFile)) && (
            <h2 className='text-lg font-semibold'>{leftFile.name} Loaded</h2>
          )
        }
        {
          (rightFile && !(leftFile && rightFile)) && (
            <h2 className='text-lg font-semibold'>{rightFile.name} Loaded</h2>
          )
        }
        {
          leftFile && rightFile && (
            <>
              <div>
                <div>
                  <h1 className='text-lg font-bold my-4'>{leftFile.name} ({leftFile.type})</h1>
                </div>
                <div>
                  <ScrollArea className="w-full rounded-md border p-2 h-[700px]">
                    {renderTreeNode({
                      value: leftFile.content,
                      otherValue: rightFile.content,
                      path: '',
                      side: 'left',
                      level: 0
                    })}
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              </div>

              <div>
                <div>
                  <h1 className="text-lg font-bold my-4">{rightFile.name} ({rightFile.type})</h1>
                </div>
                <div>
                  <ScrollArea className="w-full rounded-md border p-2 h-[700px]">
                    {renderTreeNode({
                      value: rightFile.content,
                      otherValue: leftFile.content,
                      path: '',
                      side: 'right',
                      level: 0
                    })}
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              </div>
            </>
          )
        }
      </div>
    );
  };

  return (
    <div className="p-4 flex flex-col">
      <div className='max-w-6xl mx-auto'>
        <div className='text-2xl font-semibold mb-4'>
          Lineage Report Comparison Tool
        </div>
        <div>
          {/* <Button className='mb-4' onClick={() => setModalOpen(true)}>Select Report for Comparison</Button> */}
          <div className="grid grid-cols-2 gap-4">
            <FileUploadSection side="left" label="Left File" />
            <FileUploadSection side="right" label="Right File" />
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {renderComparison()}

      <div className="flex items-center space-x-4 mt-8 mb-4 max-w-6xl mx-auto">
        <div className="flex space-x-2 items-center">
          <LuPlus size={16} className="text-green-600" />
          <span className="text-green-600">Added</span>
        </div>
        <div className="flex space-x-2 items-center">
          <LuMinus size={16} className="text-red-600" />
          <span className="text-red-600">Removed</span>
        </div>
        <div className="flex space-x-2 items-center">
          <LuClipboardPenLine size={16} className="text-yellow-600" />
          <span className="text-yellow-600">Modified</span>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex flex-col space-y-2 border p-4 rounded-md max-w-6xl mx-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-semibold cursor-help">
                Similarity: {compareResult?.similarityPercentage ?? '0'} %
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Report similarities are calculated based on the number of matching properties.
                Following properties are ignored during comparison: {IGNORED_PROPERTIES.join(', ')}.
                This value may lower than expected since it only considers extact matches.
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-semibold cursor-help">
                Matching Properties: {compareResult?.matchingProperties ?? '0'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                The number of properties that are identical between the two
                compared items. To be considered a match, each property must be identical.
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-semibold cursor-help">
                Total Properties: {compareResult?.totalProperties ?? '0'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                The total number of unique properties across both items being compared.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <div className="flex items-center space-x-4 my-4 max-w-6xl mx-auto">
        <SaveButton file={leftFile} side="left" disabled={!!error || !leftFile} />
        <SaveButton file={rightFile} side="right" disabled={!!error || !rightFile} />
      </div>
      {/* <ReportModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelectFile={handleFileSelect}
      /> */}
    </div>
  );
};

interface SaveButtonProps {
  file: FileWithType | null;
  side: 'left' | 'right';
  disabled?: boolean;
}

const SaveButton: React.FC<SaveButtonProps> = ({ file, side, disabled }) => {
  const handleSave = async () => {
    if (!file) return;

    try {
      const blob = new Blob([JSON.stringify(file.content, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${side}-${file.type}-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Error saving ${side} file:`, error);
    }
  };

  return (
    <Button
      onClick={handleSave}
      disabled={disabled || !file}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <LuSave className="w-4 h-4" />
      Save {side === 'left' ? 'Left' : 'Right'} File
    </Button>
  );
};

export default App;