import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in">
      <Card className="w-full">
        <CardContent className="flex items-center gap-6 p-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex flex-col gap-2 w-full max-w-md">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 mt-4">
          <Card className="w-full">
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
          
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
