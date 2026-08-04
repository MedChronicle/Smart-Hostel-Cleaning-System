import React, { useState, useEffect, useRef } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Play, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function SimulationControls() {
  const { 
    rooms, 
    staff, 
    assignTask, 
    priorityQueue 
  } = useHostel();

  const handleQuickAssign = () => {
    if (priorityQueue.size() === 0) {
      toast.error('No pending tasks in queue');
      return;
    }
    
    if (staff.filter(s => s.status === 'available').length === 0) {
      toast.error('No available staff');
      return;
    }

    assignTask();
    toast.success('Task assigned to staff member');
  };

  const availableStaff = staff.filter(s => s.status === 'available').length;
  const busyStaff = staff.filter(s => s.status === 'busy').length;
  const pendingTasks = priorityQueue.size();

  return (
    <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-950/80 dark:to-purple-950/80 border-2 border-primary/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-lg border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Available Staff</div>
            <div className="text-lg font-bold text-green-600">{availableStaff}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Busy Staff</div>
            <div className="text-lg font-bold text-orange-600">{busyStaff}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Pending Tasks</div>
            <div className="text-lg font-bold text-blue-600">{pendingTasks}</div>
          </div>
        </div>

        <Button 
          onClick={handleQuickAssign} 
          className="w-full"
          disabled={pendingTasks === 0 || availableStaff === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Assign Next Task
        </Button>

        <div className="text-xs text-muted-foreground space-y-1 p-3 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded border">
          <div className="font-semibold mb-1">Manual Task Assignment:</div>
          <div>• Click "Assign Next Task" to assign the highest priority room</div>
          <div>• Tasks are assigned to available staff in FIFO order</div>
          <div>• Complete tasks from the Staff View page</div>
        </div>
      </CardContent>
    </Card>
  );
}