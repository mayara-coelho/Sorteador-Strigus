package main

import (
    "os"
    "os/exec"
)

func main() {
    redisCmd := exec.Command("redis-server", "--daemonize", "yes")
    redisCmd.Stdout = os.Stdout
    redisCmd.Stderr = os.Stderr
    if err := redisCmd.Start(); err != nil {
        panic(err)
    }

    flaskCmd := exec.Command("flask", "run", "--host=0.0.0.0")
    flaskCmd.Stdout = os.Stdout
    flaskCmd.Stderr = os.Stderr
    if err := flaskCmd.Run(); err != nil {
        panic(err)
    }

    if err := redisCmd.Wait(); err != nil {
        panic(err)
    }
}
