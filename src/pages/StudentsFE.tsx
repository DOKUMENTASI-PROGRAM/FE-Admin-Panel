import { useStudents } from '@/hooks/useQueries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from '@/components/TableSkeleton';

export default function StudentsFEPage() {
  const { data: studentsData, isLoading: isStudentsLoading, error } = useStudents();

  if (isStudentsLoading) return <TableSkeleton columnCount={4} rowCount={10} />;
  if (error) return <div className="p-4 text-red-500">Error loading students</div>;

  const students = Array.isArray(studentsData) ? studentsData : (studentsData?.students || []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Students (FE)</h2>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Photo URL</TableHead>
              <TableHead>Can Publish</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {student.display_name || student.full_name || student.name || '-'}
                  </TableCell>
                  <TableCell>
                    {student.email || '-'}
                  </TableCell>
                  <TableCell>
                    {student.photo_url ? (
                      <img 
                        src={student.photo_url} 
                        alt={student.display_name || 'Student'} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {student.can_publish ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                  No students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
