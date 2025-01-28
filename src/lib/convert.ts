interface Column {
  column_name: string;
  column_type: string;
}

interface Node {
  id: string;
  name: string;
  columns: Column[] | { [key: string]: string };
}

interface CodeInfo {
  code: string;
  lineno: number | null;
  file_path: string;
  end_lineno: number | null;
}

interface Edge {
  operation: string;
  source_entity: string;
  target_entity: string;
  source_column: string;
  target_column: string;
  operation_description: string;
  code_info?: CodeInfo;
}

interface Graph {
  nodes: Node[];
  edges: Edge[];
}

interface MergedOperation {
  code_info: CodeInfo;
  operation: string;
  source_columns: string[];
  source_entity: string;
  target_columns: string[];
  target_entity: string;
  operation_description: string;
  source_entity_name?: string;
  target_entity_name?: string;
}

interface MergedResult {
  dataframe: Node[];
  operation: MergedOperation[];
}

interface Stage {
  graph?: Graph;
  key_info?: MergedResult;
}

interface Process {
  graph?: Graph;
  key_info?: MergedResult;
  [key: string]: any; // For other stage properties
}

interface Job {
  [processName: string]: Process;
}

interface Report {
  graph?: Graph;
  key_info?: MergedResult;
  [key: string]: any; // For XML jobs and other properties
}

interface MergedReport {
  entire_report?: MergedResult;
  [key: string]: any;
}

interface ConversionResult {
  mergedReport: MergedReport;
  updatedReport: Report;
}

function mergeOperation(graph: Graph | undefined): MergedResult {
  if (!graph) {
      console.log("No graph to merge");
      return { dataframe: [], operation: [] };
  }

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const entityDict: { [key: string]: string } = {};

  // Process nodes
  for (const node of nodes) {
      const nodeColumns = node.columns as Column[];
      const columns: { [key: string]: string } = {};
      for (const column of nodeColumns) {
          columns[column.column_name] = column.column_type;
      }
      node.columns = columns;
      entityDict[node.id] = node.name;
  }

  // Process and merge edges
  const mergedOperation: { [key: string]: MergedOperation } = {};

  for (const edge of edges) {
      if (!edge.code_info) {
          edge.code_info = {
              code: "",
              lineno: null,
              file_path: "",
              end_lineno: null
          };
      }

      const key = JSON.stringify([
          edge.operation,
          edge.source_entity,
          edge.target_entity,
          edge.code_info.file_path,
          edge.code_info.lineno
      ]);

      if (!mergedOperation[key]) {
          mergedOperation[key] = {
              code_info: edge.code_info,
              operation: edge.operation,
              source_columns: [edge.source_column],
              source_entity: edge.source_entity,
              target_columns: [edge.target_column],
              target_entity: edge.target_entity,
              operation_description: edge.operation_description
          };
      } else {
          mergedOperation[key].source_columns.push(edge.source_column);
          mergedOperation[key].target_columns.push(edge.target_column);
      }
  }

  // Convert merged operations to array and add entity names
  const mergedOperationList = Object.values(mergedOperation);
  
  for (const operation of mergedOperationList) {
      operation.source_entity_name = entityDict[operation.source_entity];
      operation.target_entity_name = entityDict[operation.target_entity];
  }

  return {
      dataframe: nodes,
      operation: mergedOperationList
  };
}

function analyzeJob(jobs: { [key: string]: Job }): [{ [key: string]: any }, { [key: string]: Job }] {
  const mergedReport: { [key: string]: any } = {};

  for (const [jobName, job] of Object.entries(jobs)) {
      for (const [processName, process] of Object.entries(job)) {
          const processGraph = process.graph;
          const processMerged = mergeOperation(processGraph);

          if (!mergedReport[jobName]) {
              mergedReport[jobName] = {};
          }

          mergedReport[jobName][processName] = processMerged;
          const mergedStages: { [key: string]: MergedResult } = {};
          mergedReport[jobName][processName].stages = mergedStages;

          for (const [stageName, stage] of Object.entries(process)) {
              if (stageName !== "graph") {
                  const stageGraph = (stage as Stage).graph;
                  let stageMerged: MergedResult = { dataframe: [], operation: [] };
                  
                  if (stageGraph) {
                      stageMerged = mergeOperation(stageGraph);
                  }

                  mergedStages[stageName] = stageMerged;
                  (stage as Stage).key_info = stageMerged;
              }
          }
          
          process.key_info = processMerged;
      }
  }

  return [mergedReport, jobs];
}

function analyzeXmlReport(report: Report): [MergedReport, Report] {
  const mergedReport: MergedReport = {};
  const reportGraph = report.graph;
  const reportMerged = mergeOperation(reportGraph);

  mergedReport.entire_report = reportMerged;
  report.key_info = reportMerged;

  for (const [xmlName, jobs] of Object.entries(report)) {
      if (typeof xmlName === 'string' && xmlName.toLowerCase().includes('.xml')) {
          const [mergedJobs, updatedJobs] = analyzeJob(jobs as { [key: string]: Job });
          mergedReport[xmlName] = mergedJobs;
          // Update the original jobs with any modifications
          report[xmlName] = updatedJobs;
      }
  }

  return [mergedReport, report];
}

// Main conversion function that processes the report
function convertReport(originalReport: Report): ConversionResult {
  const [mergedReport, updatedReport] = analyzeXmlReport(originalReport);
  return {
      mergedReport,
      updatedReport
  };
}

// Export the functions if using modules
export {
  convertReport,
  analyzeXmlReport,
  analyzeJob,
  mergeOperation,
  // Type exports
  type Report,
  type MergedReport,
  type ConversionResult,
  type Graph,
  type Node,
  type Edge,
  type CodeInfo,
  type Column,
  type MergedOperation,
  type MergedResult,
  type Stage,
  type Process,
  type Job
};