import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  customer_id: string;
  created_at: string;
  status: string;
}

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFile: (file: any, position: 'left' | 'right') => void;
}

const ReportModal = ({ open, onOpenChange, onSelectFile }: ReportModalProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://lineage-llm-185230470468.us-central1.run.app/api/v1/reports?page=${page}&size=10`, {
        headers: {
          'Authorization': `Bearer lsv2_sk_9b6e0b9135sdfsdfrwea6207062c0cccd8_7954cddeac`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      setReports(data.reports);
      setTotalPages(Math.ceil(data.total / data.size));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch reports"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open, page]);

  const handleLoadFile = async (reportId: string, position: 'left' | 'right') => {
    try {
      const response = await fetch(`https://lineage-llm-185230470468.us-central1.run.app/api/v1/report/${reportId}`, {
        headers: {
          'Authorization': `Bearer lsv2_sk_9b6e0b9135sdfsdfrwea6207062c0cccd8_7954cddeac`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch report');
      
      const reportData = await response.json();
      onSelectFile(reportData, position);
      
      toast({
        title: "Success",
        description: `Report loaded to ${position} side`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load report to ${position} side`
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Report for Comparison</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-mono">{report.id}</TableCell>
                  <TableCell>{report.customer_id}</TableCell>
                  <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell>
                  <TableCell>{report.status}</TableCell>
                  <TableCell className="space-x-2">
                    <Button 
                      size="sm"
                      onClick={() => handleLoadFile(report.id, 'left')}
                    >
                      Load Left
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleLoadFile(report.id, 'right')}
                    >
                      Load Right
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex justify-between mt-4">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <span className="py-2">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages || loading}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;