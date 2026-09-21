package com.auctionxi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AuctionXiApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuctionXiApplication.class, args);
    }
}
