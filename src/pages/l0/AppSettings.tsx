import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Moon, Sun, Laptop, ShieldAlert } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AppSettings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Application Settings</h1>
          <p className="text-muted-foreground">Manage settings for ACI Dashboard and Booth Agent App</p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                General Settings
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Appearance</Label>
                    <p className="text-sm text-muted-foreground">Customize the application theme</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setTheme('system')}
                    >
                      <Laptop className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Language</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred language</p>
                  </div>
                  <Select defaultValue="en">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ta">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Survey Settings
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Surveys on App</Label>
                    <p className="text-sm text-muted-foreground">Allow booth agents to conduct surveys</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Booth Agents to Add New Voters</Label>
                    <p className="text-sm text-muted-foreground">Enable voter registration on the app</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-xl font-semibold mb-4">Dashboard Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Live Updates</Label>
                    <p className="text-sm text-muted-foreground">Real-time data synchronization</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Data Export</Label>
                    <p className="text-sm text-muted-foreground">Enable data export for all users</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <ShieldAlert className="mr-2 h-5 w-5" />
                System Settings
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Prevent non-admin logins</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add extra security layer for admin users</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button>Save Settings</Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
