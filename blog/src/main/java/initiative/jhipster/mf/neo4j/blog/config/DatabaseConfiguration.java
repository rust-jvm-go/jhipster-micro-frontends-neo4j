package initiative.jhipster.mf.neo4j.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.neo4j.repository.config.EnableNeo4jRepositories;

@Configuration
@EnableNeo4jRepositories("initiative.jhipster.mf.neo4j.blog.repository")
public class DatabaseConfiguration {}
