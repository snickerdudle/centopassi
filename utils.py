from typing import Tuple, Union
from geopy import distance
import json
from collections import UserDict


def get_distance(lat1, lon1, lat2, lon2):
    coords_1 = (lat1, lon1)
    coords_2 = (lat2, lon2)
    return distance.distance(coords_1, coords_2).km


class Point:
    def __init__(self, lat, lon, name, kind):
        self.lat = lat
        self.lon = lon
        self.name = name
        self.kind = kind
        self.metadata = {}

    @property
    def data(self):
        return [self.kind, self.lat, self.lon]

    @classmethod
    def from_lat_long(cls, latlon: Union["Point", Tuple[float, float]]):
        if isinstance(latlon, Point):
            return latlon
        return cls(latlon[0], latlon[1], "Unnamed", "Unknown")

    def to_lat_long(self):
        return (self.lat, self.lon)

    def __str__(self):
        return f"{self.name} ({self.lat}, {self.lon})"

    def __repr__(self):
        return self.__str__()


class PointSet(UserDict):
    def __init__(self, points: dict[str, list[str, float, float]]):
        self.data = {}
        for name, (kind, lat, lon) in points.items():
            self.data[name] = Point(lat, lon, name, kind)

    @classmethod
    def from_JSON(self, filename) -> "PointSet":
        with open(filename) as f:
            data = json.load(f)
        new_set = PointSet(data)
        print(f"Loaded {len(new_set)} points from {filename}")
        return new_set

    def get_all_within_radius(
        self, lat: float, lon: float, radius: float
    ) -> "PointSet":
        points = {}
        for name, point in self.items():
            if get_distance(lat, lon, point.lat, point.lon) <= radius:
                points[name] = point.data
        return PointSet(points)


if __name__ == "__main__":
    points = PointSet.from_JSON("centopassi_2024.json")
    new_points = points.get_all_within_radius(
        43.5608498155039, 13.60190451547959, 52
    )
    print(len(new_points))
