"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, Bot, User, ImagePlus, Mic, MicOff, Star, XCircle } from "lucide-react";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAiResponse, getFoodAnalysis, getTranscript } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { KidneyIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};

type HistoryMessage = {
  role: "user" | "model";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleSendMessage = async (messageContent: string, imageUri?: string | null) => {
    if ((!messageContent.trim() && !imageUri) || isLoading) return;

    const userMessage: Message = { role: "user", content: messageContent, image: imageUri ?? undefined };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImagePreview(null);
    setIsLoading(true);

    try {
      if (imageUri) {
         const result = await getFoodAnalysis({photoDataUri: imageUri, question: messageContent});
         let assistantContent = `I have analyzed the image. It appears to be **${result.foodName}**.`;
         
         if (result.answer) {
          assistantContent += `\n\n${result.answer}`;
         }

         assistantContent += `\n\nHere is the nutritional information: \n- **Calories:** ${result.calories} kcal\n- **Protein:** ${result.protein}g`;

          const assistantMessage: Message = {
            role: 'assistant',
            content: assistantContent,
          };
          setMessages(prev => [...prev, assistantMessage]);

      } else {
        const history: HistoryMessage[] = messages
          .filter(m => !m.image)
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content
          }));

        const response = await getAiResponse({ question: messageContent, history });
        const assistantMessage: Message = { role: "assistant", content: response.answer };
        setMessages((prev) => [...prev, assistantMessage]);
      }
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
       if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        setImagePreview(dataUri);
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
    await handleSendMessage(input, imagePreview);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  return (
    <Card className="w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <KidneyIcon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            KidneyCare AI
          </h1>
        </div>
        <Button variant="ghost" size="icon">
          <Star className="text-yellow-400 fill-yellow-400" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" viewportRef={scrollAreaRef}>
          <div className="p-4 md:p-6 space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground pt-20">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Bot className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">How can I help you today?</h2>
                <p className="max-w-sm mt-2">
                  Ask me about kidney health, or upload a food picture for nutritional analysis.
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-4",
                  message.role === "user" ? "justify-end" : ""
                )}
              >
                {message.role === "assistant" && (
                   <Avatar className="w-9 h-9 border bg-primary/10">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="w-5 h-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xl rounded-2xl p-4",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-secondary text-secondary-foreground rounded-bl-none"
                  )}
                >
                  {message.image && (
                     <div className="mb-2 -m-1">
                        <Image src={message.image} alt="User upload" width={400} height={400} className="rounded-t-xl"/>
                     </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                 {message.role === "user" && (
                  <Avatar className="w-9 h-9 border">
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <Avatar className="w-9 h-9 border bg-primary/10">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="w-5 h-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-md p-4 rounded-2xl bg-secondary rounded-bl-none">
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
      </CardContent>

      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex items-start gap-2 w-full">
           <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isLoading || isRecording}
          />
          <div className="flex-1 flex flex-col gap-2">
            {imagePreview && (
              <div className="relative w-24 h-24 rounded-md overflow-hidden">
                <Image src={imagePreview} alt="Image preview" layout="fill" objectFit="cover" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 hover:bg-black/75 text-white"
                  onClick={() => {
                    setImagePreview(null)
                    if(fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={imagePreview ? "Ask a question about the image..." : "Type your message..."}
                className="flex-1 text-base bg-secondary border-transparent focus:border-primary focus:ring-primary rounded-2xl resize-none min-h-[50px] max-h-[200px] pr-20"
                disabled={isLoading || isRecording}
                autoComplete="off"
                aria-label="Chat input"
                rows={1}
              />
              <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isRecording || !!imagePreview}
                  aria-label="Upload an image"
                >
                  <ImagePlus className="w-5 h-5"/>
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleVoiceRecording}
                  disabled={isLoading}
                  className={cn("h-10 w-10 shrink-0 rounded-full", isRecording && "text-red-500 bg-red-500/10")}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
          <Button type="submit" size="icon" className="h-12 w-12 self-end shrink-0 rounded-full" disabled={isLoading || (!input.trim() && !imagePreview) || isRecording} aria-label="Send message">
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
