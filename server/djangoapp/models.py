from datetime import date
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class CarMake(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CarModel(models.Model):
    car_make = models.ForeignKey(CarMake, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=20, choices=[
        ('Sedan', 'Sedan'), ('SUV', 'SUV'), ('Wagon', 'Wagon'), ('Truck', 'Truck'),
        ('Coupe', 'Coupe'), ('Hatchback', 'Hatchback'), ('Convertible', 'Convertible'),
    ], default='Sedan')
    year = models.PositiveIntegerField(validators=[MinValueValidator(2015), MaxValueValidator(2027)])
    dealer_id = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['car_make__name', 'name', 'year']
        constraints = [models.UniqueConstraint(fields=['car_make', 'name', 'year', 'dealer_id'], name='unique_car_model')]

    def __str__(self):
        return f'{self.car_make.name} {self.name} ({self.year})'
