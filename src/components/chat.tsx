"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { SendHorizonal, Bot, User, CornerDownLeft, ImagePlus, Mic, MicOff } from "lucide-react";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAiResponse, getFoodAnalysis, getTranscript } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { KidneyIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageContent };
    setMessages((prev) => [...prev, userMessage]);
    if (messageContent === input) {
      setInput("");
    }
    setIsLoading(true);

    try {
      const response = await getAiResponse(messageContent);
      const assistantMessage: Message = { role: "assistant", content: response.answer };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get a response. Please try again later.",
      });
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm sorry, but I'm having trouble connecting. Please try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        
        const userMessage: Message = { role: "user", content: `Analyze this image:`, image: dataUri };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
          const result = await getFoodAnalysis(dataUri);
          const assistantMessage: Message = {
            role: 'assistant',
            content: `I have analyzed the image. It appears to be **${result.foodName}**. Here is the nutritional information: \n\n- **Calories:** ${result.calories} kcal\n- **Protein:** ${result.protein}g`,
          };
          setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
           console.error("Error getting food analysis:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to analyze the image. Please try again.",
            });
             const errorMessage: Message = {
              role: "assistant",
              content: "I'm sorry, I was unable to analyze that image.",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
          // Reset file input
          if(fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUri = reader.result as string;
          setIsLoading(true);
          try {
            const { transcript } = await getTranscript(dataUri);
            if (transcript) {
              await handleSendMessage(transcript);
            } else {
               toast({
                variant: "destructive",
                title: "Speech-to-Text Error",
                description: "Could not understand audio, please try again",
              });
            }
          } catch(e) {
             toast({
              variant: "destructive",
              title: "Speech-to-Text Error",
              description: "Could not process audio, please try again",
            });
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: "Could not access microphone. Please check your browser permissions.",
      });
    }
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSendMessage(input);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b shadow-sm">
        <div className="flex items-center gap-3">
          <KidneyIcon className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold md:text-2xl font-headline text-primary">
            KidneyCare Chat
          </h1>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" viewportRef={scrollAreaViewportRef}>
          <div className="p-4 md:p-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground pt-20">
                <Bot className="w-16 h-16 mb-4 text-primary/80" />
                <h2 className="text-2xl font-semibold">Welcome!</h2>
                <p className="max-w-md mt-2">
                  Ask me anything about kidney health or upload an image of food to get its nutritional information.
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-4",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-10 h-10 border bg-accent/50">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="w-6 h-6 text-accent-foreground" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xl p-3 rounded-2xl shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card rounded-bl-none"
                  )}
                >
                  {message.image && (
                     <div className="mb-2">
                        <Image src={message.image} alt="User upload" width={300} height={300} className="rounded-md"/>
                     </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <Avatar className="w-10 h-10 border">
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4 justify-start">
                <Avatar className="w-10 h-10 border bg-accent/50">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="w-6 h-6 text-accent-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-md p-3 rounded-2xl shadow-sm bg-card rounded-bl-none">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-pulse"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      <footer className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isRecording}
            aria-label="Upload an image"
          >
            <ImagePlus className="w-5 h-5"/>
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isLoading || isRecording}
          />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question, upload an image or use voice..."
            className="flex-1"
            disabled={isLoading || isRecording}
            autoComplete="off"
            aria-label="Chat input"
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={handleVoiceRecording}
            disabled={isLoading}
            className={cn(isRecording && "text-red-500")}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button type="submit" size="icon" disabled={isLoading || !input.trim() || isRecording} aria-label="Send message">
            <SendHorizonal className="w-5 h-5" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <CornerDownLeft className="h-3 w-3" />
          </kbd> to send.
        </p>
      </footer>
    </div>
  );
}
