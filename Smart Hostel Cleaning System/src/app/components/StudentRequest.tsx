import React, { useState } from 'react';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { AlertCircle, Send, CheckCircle2, Sparkles, Droplets, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type CleaningType = 'cleaning' | 'wiping' | 'washing';
type NeatnessLevel = 'very-dirty' | 'dirty' | 'moderate' | 'clean';

export function StudentRequest() {
  const { rooms, requestCleaning } = useHostel();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [cleaningType, setCleaningType] = useState<CleaningType>('cleaning');
  const [neatnessLevel, setNeatnessLevel] = useState<NeatnessLevel>('moderate');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) {
      toast.error('Invalid room number');
      return;
    }

    requestCleaning(selectedRoomId);
    setSubmitted(true);
    
    // Show success with details
    toast.success(`${cleaningType.charAt(0).toUpperCase() + cleaningType.slice(1)} request submitted for Room ${selectedRoomId}`, {
      description: `Neatness: ${neatnessLevel} • Priority boost applied (+30)`
    });

    setTimeout(() => {
      setSubmitted(false);
      setSelectedRoomId('');
      setCleaningType('cleaning');
      setNeatnessLevel('moderate');
      setAdditionalDetails('');
    }, 3000);
  };

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort();

  const cleaningTypeOptions = [
    { value: 'cleaning', label: 'General Cleaning', icon: Sparkles, description: 'Full room cleaning service' },
    { value: 'wiping', label: 'Wiping', icon: Droplets, description: 'Surface wiping and dusting' },
    { value: 'washing', label: 'Washing', icon: Trash2, description: 'Deep washing and sanitization' }
  ];

  const neatnessOptions = [
    { value: 'very-dirty', label: 'Very Dirty', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
    { value: 'dirty', label: 'Dirty', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-950' },
    { value: 'moderate', label: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
    { value: 'clean', label: 'Clean', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-950/80 dark:to-purple-950/80 border-2 border-primary/20 shadow-2xl">
        <CardHeader>
          <CardTitle>Submit Cleaning Request</CardTitle>
          <CardDescription>
            Tell us about your room's condition and the type of service you need
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room Number */}
            <div className="space-y-2">
              <Label htmlFor="roomId">Room Number</Label>
              <Input
                id="roomId"
                placeholder="e.g., 101, 205"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value.toUpperCase())}
                disabled={submitted}
                className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80"
              />
            </div>

            {/* Cleaning Type Selection */}
            <div className="space-y-3">
              <Label>Type of Service Needed</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {cleaningTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCleaningType(option.value as CleaningType)}
                      disabled={submitted}
                      className={`
                        p-4 rounded-lg border-2 transition-all text-left
                        backdrop-blur-sm hover:scale-105
                        ${cleaningType === option.value 
                          ? 'border-primary bg-primary/10 shadow-lg' 
                          : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-primary/50'
                        }
                      `}
                    >
                      <Icon className={`h-5 w-5 mb-2 ${cleaningType === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Neatness Level */}
            <div className="space-y-3">
              <Label>Current Room Neatness Level</Label>
              <RadioGroup
                value={neatnessLevel}
                onValueChange={(value) => setNeatnessLevel(value as NeatnessLevel)}
                disabled={submitted}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {neatnessOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer
                      transition-all backdrop-blur-sm hover:scale-105
                      ${neatnessLevel === option.value
                        ? `border-primary ${option.bgColor} shadow-lg`
                        : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-primary/50'
                      }
                    `}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <div className="text-center">
                      <div className={`font-semibold text-sm ${neatnessLevel === option.value ? option.color : ''}`}>
                        {option.label}
                      </div>
                    </div>
                    {neatnessLevel === option.value && (
                      <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label htmlFor="details">Additional Details (Optional)</Label>
              <Textarea
                id="details"
                placeholder="Any specific areas or concerns you'd like to mention..."
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                disabled={submitted}
                className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 min-h-[100px]"
              />
              {additionalDetails && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {additionalDetails.length} characters added
                </div>
              )}
            </div>

            <Button type="submit" disabled={submitted || !selectedRoomId} className="w-full">
              {submitted ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Request Submitted Successfully!
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Cleaning Request
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 backdrop-blur-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100">How it works:</p>
                <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200">
                  <li>• Your request is added to the priority queue with +30 urgency boost</li>
                  <li>• Staff will be assigned based on availability and priority</li>
                  <li>• The cleaning type and neatness level help optimize service</li>
                  <li>• Track your request status in the Active Requests section below</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Browser */}
      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
        <CardHeader>
          <CardTitle>Browse Available Rooms</CardTitle>
          <CardDescription>Click on your room to quickly fill in the form above</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {floors.map(floor => (
              <div key={floor} className="space-y-2">
                <h3 className="font-semibold text-sm">Floor {floor}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {rooms
                    .filter(r => r.floor === floor)
                    .map(room => {
                      const getScoreColor = (score: number) => {
                        if (score >= 80) return 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900';
                        if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900';
                        return 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900';
                      };

                      return (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          disabled={submitted}
                          className={`
                            p-3 rounded-lg border-2 transition-all hover:scale-105
                            ${getScoreColor(room.cleanlinessScore)}
                            ${selectedRoomId === room.id ? 'ring-2 ring-primary scale-105' : ''}
                          `}
                        >
                          <div className="font-bold text-sm">{room.id}</div>
                          <div className="text-xs opacity-75">{room.cleanlinessScore}</div>
                          {room.studentRequestBoost && (
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 mt-1">
                              Requested
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Requests */}
      <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 shadow-2xl">
        <CardHeader>
          <CardTitle>Active Requests</CardTitle>
          <CardDescription>Rooms with pending cleaning requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rooms.filter(r => r.studentRequestBoost).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active requests</p>
              </div>
            ) : (
              rooms
                .filter(r => r.studentRequestBoost)
                .map(room => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 dark:bg-orange-950 backdrop-blur-sm hover:scale-102 transition-all"
                  >
                    <div>
                      <div className="font-semibold">Room {room.id}</div>
                      <div className="text-xs text-muted-foreground">
                        Floor {room.floor} • Score: {room.cleanlinessScore}
                      </div>
                    </div>
                    <Badge variant="destructive">Priority</Badge>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}