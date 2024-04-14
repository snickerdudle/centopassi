import os
import osmnx as ox
import networkx as nx
import matplotlib.pyplot as plt
from shapely.geometry import Point
from typing import Optional, Tuple, Union
from utils import Point


PointType = Union[Point, Tuple[float, float]]


def get_small_road_network(
    point_1: PointType,
    point_2: PointType,
    bounding_box_overshoot: float = 0.5,
) -> nx.MultiDiGraph:
    point_1 = Point.from_lat_long(point_1)
    point_2 = Point.from_lat_long(point_2)

    # Define a bounding box around the two points for downloading the map
    north = max(point1.lat, point2.lat) + bounding_box_overshoot
    south = min(point1.lat, point2.lat) - bounding_box_overshoot
    east = max(point1.lon, point2.lon) + bounding_box_overshoot
    west = min(point1.lon, point2.lon) - bounding_box_overshoot

    # Custom filter to exclude highways and major roads
    custom_filter = '["highway"!~"motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|ring_road"]'

    # Download the network map within the specified bounding box
    G = ox.graph_from_bbox(
        bbox=(north, south, east, west),
        custom_filter=custom_filter,
        network_type="drive",
    )

    # Convert bidirectional to single directional graph
    G = ox.get_undirected(G)

    # Set speed on edges
    for u, v, data in G.edges(data=True):
        speed_limit = data.get("maxspeed", "30 km/h")  # Default speed limit
        speed = ox.speed.add_edge_speeds(
            G, hwy_speeds={"residential": 30, "unclassified": 30}
        )
        data["speed_kph"] = speed[u][v][0]

    # Calculate travel time (in minutes)
    for u, v, data in G.edges(data=True):
        data["travel_time"] = data["length"] / (
            data["speed_kph"] * 1000 / 60
        )  # length in meters, speed in km/h

    return G


def get_country_network(country: str = "Italy") -> nx.MultiDiGraph:
    # Check to see if the network data has already been downloaded
    filename = f"{country.lower()}_network.graphml"
    if os.path.exists(filename):
        return ox.load_graphml(filename)

    # Configure OSMnx to use the drive network type and to not simplify the graph automatically
    ox.config(use_cache=True, log_console=True)

    # Custom filter to exclude highways and major roads
    custom_filter = '["highway"!~"motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|ring_road"]'

    # Download the network data for Italy
    G = ox.graph_from_place(
        country,
        network_type="drive",
        custom_filter=custom_filter,
    )

    # Optionally: save the graph to disk as GraphML (or any other format you prefer)
    ox.save_graphml(G, filepath=filename)

    return G


def find_shortest_path(
    point1: PointType, point2: PointType, G: Optional[nx.MultiDiGraph] = None
):
    G = G or get_small_road_network(point1, point2)

    # Get the nearest nodes to the specified points
    orig_node = ox.nearest_nodes(G, point1.lon, point1.lat)
    dest_node = ox.nearest_nodes(G, point2.lon, point2.lat)

    # Find the shortest path
    shortest_length_route = nx.shortest_path(
        G, orig_node, dest_node, weight="length"
    )

    # Find the quickest path
    quickest_time_route = nx.shortest_path(
        G, orig_node, dest_node, weight="travel_time"
    )

    # Plot the route
    fig1, ax1 = ox.plot_graph_route(G, shortest_length_route, node_size=0)
    fig2, ax2 = ox.plot_graph_route(G, quickest_time_route, node_size=0)
    plt.show()

    # Save the plot to disk
    fig1.savefig("shortest_length_route.png")
    fig2.savefig("quickest_time_route.png")

    return shortest_length_route


if __name__ == "__main__":
    # Define the latitude and longitude for two points
    point1 = Point.from_lat_long((45.4642, 9.1900))  # Example: Milan
    point2 = Point.from_lat_long((45.4383, 10.9916))  # Example: Verona

    # Get the network
    G = get_country_network()

    # Find and plot the shortest path
    route = find_shortest_path(G, point1, point2)

    print(route)
