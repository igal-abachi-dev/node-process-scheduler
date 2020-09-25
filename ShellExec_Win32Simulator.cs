using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;

namespace WpfExplorer.Utils
{
    //ShellExec Simulator
    public static class ShellExecSim
    {

        public static bool ShellExec(string cd,string app)
        {
            if (string.IsNullOrEmpty(app) || app[0] == '*') return false;

            //if already with full path
            if (ExecuteCmd(app)) return true;

            string exec = GetExecutableOnDir(cd, app);//Current Directory
            if (exec != null)
            {
                return ExecuteCmd(exec);
            }

            exec = GetExecutableOnDir(Environment.SystemDirectory, app);//%SystemRoot%\system32
            if (exec != null)
            {
                return ExecuteCmd(exec);
            }

            exec = GetExecutableOnDir(Environment.GetEnvironmentVariable("SystemRoot"), app);//C:\windows
            if (exec != null)
            {
                return ExecuteCmd(exec);
            }

            exec = GetFromAppPath(app);//HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths
            if (exec != null)
            {
                return ExecuteCmd(exec);
            }
            
            //maybe iterate Program Files & Program files (X86) exe's

            return false;
        }

        private static string GetFromAppPath(string app)
        {
            var ext = GetExtention(app);
            if (ext != null && !app.ToLowerInvariant().EndsWith(".exe", StringComparison.Ordinal))
            {
                return null;
            }

            RegistryKey k_appPaths = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths");

            if (k_appPaths == null)
                return null;

            var keyname = (ext == null) ? app + ".EXE" : app;

            var kApp = k_appPaths.OpenSubKey(keyname);
            if (kApp == null)
                return null;

            var path = kApp.GetValue(string.Empty) as string;//get default Value

            if (string.IsNullOrEmpty(path) || !(new FileInfo(path).Exists))
            {
                return null;
            }

            kApp.Close();
            k_appPaths.Close();

            return path;
        }

        private static string GetExecutableOnDir(string path,string app)
        {
            var files = Directory.GetFiles(path);
            var fSet = new HashSet<string>();

            int len = files.Length;

            if (GetExtention(app) != null)
            {
                var fullPath = Path.GetFullPath(Path.Combine(path, app));
                if (new FileInfo(fullPath).Exists) return fullPath;
            }
            else
            {
                int ExpectedNameLength = app.Length + 4;
                app = app.ToLowerInvariant();

                for (int i = 0; i < len; i++)
                {
                    var f = files[i].Substring(path.Length+1).ToLowerInvariant();
                    if (f.StartsWith(app, StringComparison.Ordinal) && f.Length == ExpectedNameLength)
                        fSet.Add(f);
                }

                const string _EXE = ".EXE";
                const string _BAT = ".BAT";
                const string _CMD = ".CMD";
                const string _CPL = ".CPL";
                const string _MSC = ".MSC";

                string f1;
                if (FileOfExtensionExists(fSet, app, _EXE, path, out f1))
                    return f1;

                string f2;
                if (FileOfExtensionExists(fSet, app, _BAT, path, out f2))
                    return f2;

                string f3;
                if (FileOfExtensionExists(fSet, app, _CMD, path, out f3))
                    return f3;

                string f4;
                if (FileOfExtensionExists(fSet, app, _CPL, path, out f4))
                    return f4;

                string f5;
                if (FileOfExtensionExists(fSet, app, _MSC, path, out f5))
                    return f5;
            }
            return null;
        }

        private static bool FileOfExtensionExists(IEnumerable<string> fSet, string app, string ext, string path, out string fullPath)
        {
            foreach (var file in fSet)
            {
                if (file.ToUpperInvariant().EndsWith(ext, StringComparison.Ordinal))
                {
                    fullPath = Path.GetFullPath(Path.Combine(path, app + ext));
                    return true;
                }
            }
            fullPath = null;
            return false;
        }

        private static string GetExtention(string path)
        {
            int length = path.Length;
            for (int i = length; --i >= 0; )//start from the end
            {
                char ch = path[i];

                if (ch == '.')
                    return path.Substring(i, length - i);//return the extension

                if (ch == Path.DirectorySeparatorChar || ch == Path.AltDirectorySeparatorChar || ch == Path.VolumeSeparatorChar)//stop if you get \ / : because you will not find extension after that
                    break;
            }
            return null;//didn't found any file extension
        }

        private static bool ExecuteCmd(string path)
        {
            try
            {
                if (!new FileInfo(path).Exists) return false;

                Process.Start(path);

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
