import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
  confirmPassword: z.string().min(6, { message: "Password minimal 6 karakter" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a session (user is logged in via the recovery link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, maybe the link is invalid or expired
        toast({
          variant: "destructive",
          title: "Link Tidak Valid",
          description: "Link reset password tidak valid atau kedaluwarsa.",
        });
        navigate('/login');
      }
    };
    
    checkSession();
  }, [navigate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) throw error;

      toast({
        title: "Password Diperbarui",
        description: "Password Anda berhasil direset. Anda sekarang dapat login dengan password baru.",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Gagal mereset password.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Masukkan password baru Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Memperbarui...
                  </>
                ) : (
                  "Perbarui Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
