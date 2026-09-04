import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sparkles, Code, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router';

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show welcome dialog on first visit
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setOpen(false);
  };

  const handleGuide = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setOpen(false);
    navigate('/guide');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Welcome to Smart Hostel Cleaning System</DialogTitle>
              <DialogDescription className="text-base">
                A DSA-powered resource optimization platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-primary/20">
            <h3 className="font-semibold mb-2">What This System Demonstrates</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">DSA</Badge>
                <span>Priority Queue (Max Heap)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">DSA</Badge>
                <span>Graph Traversal (BFS)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">DSA</Badge>
                <span>Dijkstra's Algorithm</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">DSA</Badge>
                <span>FIFO Queue</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">DSA</Badge>
                <span>HashMap Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Real-time</Badge>
                <span>Live Updates</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Quick Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  <strong>32 rooms</strong> across 4 floors modeled as a graph with adjacency relationships
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  <strong>Priority queue</strong> automatically schedules cleaning tasks by urgency score
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  <strong>BFS algorithm</strong> finds optimal cleaning paths through adjacent dirty rooms
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  <strong>FIFO staff queue</strong> ensures fair task distribution among 6 cleaning staff
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>
                  <strong>HashMap</strong> tracks complete cleaning history for analytics and predictions
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold mb-2 text-orange-900 dark:text-orange-100">
              💡 Pro Tip: Try the Auto-Simulation
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Enable simulation mode on the Dashboard to watch the system automatically assign tasks, 
              complete cleanings, and handle student requests. It's the best way to see all DSA concepts in action!
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGuide} className="flex-1">
              <BookOpen className="h-4 w-4 mr-2" />
              View Quick Guide
            </Button>
            <Button onClick={handleClose} variant="secondary" className="flex-1">
              <Code className="h-4 w-4 mr-2" />
              Explore Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
