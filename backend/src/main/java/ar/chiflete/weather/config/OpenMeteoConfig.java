package ar.chiflete.weather.config;

import java.time.Clock;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import ar.chiflete.weather.adapter.out.openmeteo.OpenMeteoCityCatalog;
import ar.chiflete.weather.adapter.out.openmeteo.OpenMeteoWeatherProvider;
import ar.chiflete.weather.application.port.in.GetCurrentWeather;
import ar.chiflete.weather.application.port.in.SearchCities;
import ar.chiflete.weather.application.port.out.CityCatalog;
import ar.chiflete.weather.application.port.out.WeatherProvider;
import ar.chiflete.weather.application.service.GetCurrentWeatherService;
import ar.chiflete.weather.application.service.SearchCitiesService;

/**
 * Conecta los puertos con Open-Meteo. Los clientes salen del {@link RestClient.Builder}
 * autoconfigurado, así que heredan los plazos de {@code spring.http.clients.*} y registran las
 * métricas {@code http.client.requests}. El dominio y los casos de uso no conocen Spring.
 */
@Configuration(proxyBeanMethods = false)
public class OpenMeteoConfig {

    @Bean
    CityCatalog cityCatalog(RestClient.Builder builder,
            @Value("${chiflete.open-meteo.geocoding-url}") String geocodingUrl) {
        return new OpenMeteoCityCatalog(builder.clone().baseUrl(geocodingUrl).build());
    }

    @Bean
    WeatherProvider weatherProvider(RestClient.Builder builder,
            @Value("${chiflete.open-meteo.forecast-url}") String forecastUrl) {
        return new OpenMeteoWeatherProvider(builder.clone().baseUrl(forecastUrl).build());
    }

    @Bean
    SearchCities searchCities(CityCatalog cityCatalog) {
        return new SearchCitiesService(cityCatalog);
    }

    @Bean
    GetCurrentWeather getCurrentWeather(WeatherProvider weatherProvider, Clock clock) {
        return new GetCurrentWeatherService(weatherProvider, clock);
    }
}
