import React, { useState, useRef, useEffect } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { QrCode, CheckCircle, Camera, Scan } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export function StaffView() {
  const { staff, rooms, completeTask } = useHostel();
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [newScore, setNewScore] = useState([85]);
  const [duration, setDuration] = useState('20');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const busyStaff = staff.filter(s => s.status === 'busy');

  const generateQR = async (roomId: string) => {
    try {
      const qrData = JSON.stringify({
        roomId,
        timestamp: Date.now(),
        type: 'cleaning_verification'
      });
      const url = await QRCode.toDataURL(qrData, { width: 300 });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      generateQR(selectedRoom);
    }
  }, [selectedRoom]);

  const handleComplete = () => {
    if (!selectedStaff || !selectedRoom) {
      toast.error('Please select both staff and room');
      return;
    }

    const durationNum = parseInt(duration) || 20;
    completeTask(selectedRoom, selectedStaff, newScore[0], durationNum);
    
    toast.success('Task completed successfully!', {
      description: `Room ${selectedRoom} cleaned by ${staff.find(s => s.id === selectedStaff)?.name}`
    });

    setSelectedStaff('');
    setSelectedRoom('');
    setNewScore([85]);
    setDuration('20');
    setQrDataUrl('');
  };

  const handleQRScan = () => {
    // Simulate QR code scan
    setShowQRScanner(true);
    setTimeout(() => {
      setShowQRScanner(false);
      toast.success('QR Code scanned successfully!');
      handleComplete();
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Current Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Active Cleaning Tasks</CardTitle>
          <CardDescription>Staff members currently assigned to rooms</CardDescription>
        </CardHeader>
        <CardContent>
          {busyStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active tasks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {busyStaff.map(member => {
                const room = rooms.find(r => r.id === member.currentTask);
                return (
                  <div
                    key={member.id}
                    className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.id}</div>
                      </div>
                      <Badge variant="secondary">In Progress</Badge>
                    </div>
                    {room && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Room:</span>
                          <span className="font-semibold">{room.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Score:</span>
                          <span>{room.cleanlinessScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Floor:</span>
                          <span>{room.floor}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Task Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Complete Cleaning Task</CardTitle>
            <CardDescription>Mark a task as complete and update room status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose staff member" />
                </SelectTrigger>
                <SelectContent>
                  {busyStaff.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - Room {member.currentTask}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room Number</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms
                    .filter(r => busyStaff.some(s => s.currentTask === r.id))
                    .map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.id} (Floor {room.floor})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>New Cleanliness Score: {newScore[0]}</Label>
              <Slider
                value={newScore}
                onValueChange={setNewScore}
                min={60}
                max={100}
                step={5}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>60</span>
                <span>80</span>
                <span>100</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="120"
              />
            </div>

            <Button 
              onClick={handleComplete}
              disabled={!selectedStaff || !selectedRoom}
              className="w-full"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Complete
            </Button>
          </CardContent>
        </Card>

        {/* QR Code Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Verification
            </CardTitle>
            <CardDescription>
              Scan QR code to verify room cleaning completion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRoom ? (
              <>
                <div className="bg-white p-4 rounded-lg border-2 border-dashed">
                  {qrDataUrl && (
                    <img 
                      src={qrDataUrl} 
                      alt={`QR Code for Room ${selectedRoom}`}
                      className="w-full max-w-[250px] mx-auto"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    Room {selectedRoom} Verification Code
                  </p>
                  <Button 
                    onClick={handleQRScan}
                    variant="outline"
                    className="w-full"
                  >
                    <Scan className="mr-2 h-4 w-4" />
                    Scan QR Code
                  </Button>
                </div>

                {showQRScanner && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                    <Camera className="h-8 w-8 mx-auto mb-2 text-blue-600 animate-pulse" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Scanning QR code...
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>✓ Auto-updates cleanliness score</p>
                  <p>✓ Logs completion timestamp</p>
                  <p>✓ Returns staff to available queue</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a room to generate QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(member => (
              <div
                key={member.id}
                className={`p-4 border rounded-lg ${
                  member.status === 'busy' 
                    ? 'bg-orange-50 dark:bg-orange-950' 
                    : 'bg-green-50 dark:bg-green-950'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.id}</div>
                  </div>
                  <Badge variant={member.status === 'available' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks Completed:</span>
                    <span className="font-semibold">{member.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Efficiency:</span>
                    <span className="font-semibold">{member.efficiency}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
